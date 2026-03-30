package com.valoreon.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.validation.constraints.Email;

@Getter
@Setter
@Entity
@Table(name = "users")
@NoArgsConstructor
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "public_id", nullable = false, unique = true, updatable = false)
	private UUID publicId;

	@NotNull
	@Column(name = "name", nullable = false, length = 512)
	private String name;

	@Email
	@NotNull
	@Column(name = "email", nullable = false, unique = true, length = 256)
	private String email;

	@NotNull
	@Column(name = "password", nullable = false, length = 256)
	private String password;

	@Column(name = "phone", length = 32)
	private String phone;

	@Column(name = "profile_image_url", length = 1024)
	private String profileImageUrl;

	@Column(name = "active", nullable = false)
	private boolean active = true;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

//	@JsonManagedReference
//	@OneToMany(mappedBy = "user")
//	private List<Company> companies = new ArrayList<>();

	@PrePersist
	public void prePersist() {
		if (publicId == null) {
			publicId = UUID.randomUUID();
		}
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}

	@PreUpdate
	public void preUpdate() {
		this.updatedAt = LocalDateTime.now();
	}


//	public void addCompany(Company company) {
//		companies.add(company);
//		company.setUser(this);
//	}

}
