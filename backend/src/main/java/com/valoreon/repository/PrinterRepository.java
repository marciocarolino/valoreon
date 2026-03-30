package com.valoreon.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.valoreon.model.Printer;
import com.valoreon.model.User;
import com.valoreon.model.enums.PrinterStatus;

@Repository
public interface PrinterRepository extends JpaRepository<Printer, Long> {

	@Query("SELECT p FROM Printer p WHERE p.user.id = :userId")
	List<Printer> findByUserId(@Param("userId") Long userId);

	default List<Printer> findByUser(User user) {
		return findByUserId(user.getId());
	}

	@Query("SELECT p FROM Printer p WHERE p.id = :id AND p.user.id = :userId")
	Optional<Printer> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

	default Optional<Printer> findByIdAndUser(Long id, User user) {
		return findByIdAndUserId(id, user.getId());
	}

	@Modifying
	@Query("""
			UPDATE Printer p
			SET p.status = :status,
			p.updatedAt = CURRENT_TIMESTAMP
			WHERE p.id = :printerId
			AND p.user.id = :userId
			""")
	void updateStatus(
			@Param("printerId") Long printerId,
			@Param("userId") Long userId,
			@Param("status") PrinterStatus status);
}
