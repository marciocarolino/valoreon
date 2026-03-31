package com.valoreon.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * MVC configuration.
 *
 * CORS is intentionally NOT configured here. Spring Security's CorsFilter
 * (wired via SecurityConfig.corsConfigurationSource()) handles CORS at the
 * filter chain level, which ensures headers are present even on 401/403
 * responses that never reach the MVC layer.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
