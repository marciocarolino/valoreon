package com.valoreon.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.valoreon.model.Company;
import com.valoreon.model.User;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

	@Query("SELECT c FROM Company c WHERE c.user.id = :userId")
	List<Company> findByUserId(@Param("userId") Long userId);

	default List<Company> findByUser(User user) {
		return findByUserId(user.getId());
	}

	default List<Company> findAllByUser(User user) {
		return findByUserId(user.getId());
	}

	@Query("SELECT c FROM Company c WHERE c.id = :id AND c.user.id = :userId")
	Optional<Company> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

	default Optional<Company> findByIdAndUser(Long id, User user) {
		return findByIdAndUserId(id, user.getId());
	}
}
