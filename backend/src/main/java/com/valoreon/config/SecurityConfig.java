package com.valoreon.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.valoreon.security.JwtAuthenticationFilter;
import com.valoreon.security.RateLimitFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Value("${cors.origin:http://localhost:4200}")
	private String allowedOrigin;

	private final JwtAuthenticationFilter jwtAuthFilter;
	private final AuthenticationProvider authenticationProvider;
	private final RateLimitFilter rateLimitFilter;

	public SecurityConfig(
			JwtAuthenticationFilter jwtAuthFilter,
			AuthenticationProvider authenticationProvider,
			RateLimitFilter rateLimitFilter) {
		this.jwtAuthFilter = jwtAuthFilter;
		this.authenticationProvider = authenticationProvider;
		this.rateLimitFilter = rateLimitFilter;
	}

	/**
	 * Registers CORS configuration as a bean so Spring Security's CorsFilter
	 * can apply headers before any authentication check — including on 401/403
	 * responses and OPTIONS preflight requests.
	 *
	 * This is what .cors(Customizer.withDefaults()) looks up. Without this bean,
	 * Spring Security falls back to the MVC layer, which is too late for rejected
	 * requests (the browser never sees the CORS header on a 401).
	 */
	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();

		// Exact origin required when allowCredentials=true — wildcards are forbidden
		config.setAllowedOrigins(List.of(allowedOrigin));

		// Support credential-bearing cross-origin requests (httpOnly cookie)
		config.setAllowCredentials(true);

		config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

		// Allow all request headers — required for Authorization + Content-Type
		// and any custom headers the browser may add
		config.setAllowedHeaders(List.of("*"));

		// Expose Authorization header so the frontend can read it if needed
		config.setExposedHeaders(List.of("Authorization"));

		// Cache preflight response for 1 hour
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			// withDefaults() resolves the CorsConfigurationSource bean above
			.cors(Customizer.withDefaults())
			.csrf(csrf -> csrf.disable())
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.headers(headers -> headers
				.frameOptions(frame -> frame.deny())
				.contentTypeOptions(Customizer.withDefaults())
				.httpStrictTransportSecurity(hsts -> hsts
					.includeSubDomains(true)
					.maxAgeInSeconds(31_536_000)
				)
			)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
				.requestMatchers("/auth/**").permitAll()
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.requestMatchers(HttpMethod.POST, "/user").permitAll()
				.requestMatchers(HttpMethod.POST, "/feedback").permitAll()
				.anyRequest().authenticated()
			)
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
			)
			.authenticationProvider(authenticationProvider)
			.addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
			.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}
}
