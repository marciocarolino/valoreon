package com.valoreon.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.valoreon.model.Maintenance;
import com.valoreon.model.enums.MaintenanceStatus;

@Repository
public interface MaintenanceRepository extends JpaRepository<Maintenance, Long> {

	@Query("SELECT m FROM Maintenance m JOIN FETCH m.printer WHERE m.user.id = :userId "
			+ "ORDER BY m.startDate DESC, m.createdAt DESC")
	List<Maintenance> findAllForUserId(@Param("userId") Long userId);

	@Query("SELECT m FROM Maintenance m JOIN FETCH m.printer WHERE m.user.id = :userId "
			+ "AND m.printer.id = :printerId ORDER BY m.startDate DESC, m.createdAt DESC")
	List<Maintenance> findAllForUserIdAndPrinterId(
			@Param("userId") Long userId,
			@Param("printerId") Long printerId);

	@Query("SELECT m FROM Maintenance m WHERE m.id = :id AND m.user.id = :userId")
	Optional<Maintenance> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

	@Query("SELECT m FROM Maintenance m JOIN FETCH m.printer WHERE m.id = :id AND m.user.id = :userId")
	Optional<Maintenance> findByIdAndUserIdWithPrinter(@Param("id") Long id, @Param("userId") Long userId);

	@Query("SELECT m FROM Maintenance m WHERE m.user.id = :userId ORDER BY m.startDate DESC, m.createdAt DESC")
	List<Maintenance> findAllByUserId(@Param("userId") Long userId);

	default List<Maintenance> findByUserId(Long userId) {
		return findAllByUserId(userId);
	}

	@Query("SELECT m FROM Maintenance m WHERE m.user.id = :userId "
			+ "AND m.maintenanceDate >= :startInclusive AND m.maintenanceDate < :endExclusive")
	List<Maintenance> findAllForUserIdAndMaintenanceDateRange(
			@Param("userId") Long userId,
			@Param("startInclusive") LocalDate startInclusive,
			@Param("endExclusive") LocalDate endExclusive);

	@Query("""
			SELECT m FROM Maintenance m
			JOIN FETCH m.printer
			WHERE m.user.id = :userId
			AND m.status = :status
			ORDER BY m.startDate DESC
			""")
	List<Maintenance> findByUserIdAndStatus(
			@Param("userId") Long userId,
			@Param("status") MaintenanceStatus status);

	default List<Maintenance> findInProgressByUserId(Long userId) {
		return findByUserIdAndStatus(userId, MaintenanceStatus.IN_PROGRESS);
	}

	default List<Maintenance> findFinishedByUserId(Long userId) {
		return findByUserIdAndStatus(userId, MaintenanceStatus.FINISHED);
	}

	@Query("""
			SELECT m FROM Maintenance m
			JOIN FETCH m.printer
			WHERE m.user.id = :userId
			AND m.printer.id = :printerId
			AND m.status = :status
			ORDER BY m.startDate DESC
			""")
	List<Maintenance> findByUserIdAndPrinterIdAndStatus(
			@Param("userId") Long userId,
			@Param("printerId") Long printerId,
			@Param("status") MaintenanceStatus status);

	@Query("""
			SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END
			FROM Maintenance m
			WHERE m.printer.id = :printerId
			AND m.user.id = :userId
			AND m.status = :status
			""")
	boolean existsByPrinterIdAndUserIdAndStatus(
			@Param("printerId") Long printerId,
			@Param("userId") Long userId,
			@Param("status") MaintenanceStatus status);

	default boolean existsInProgressMaintenance(Long printerId, Long userId) {
		return existsByPrinterIdAndUserIdAndStatus(printerId, userId, MaintenanceStatus.IN_PROGRESS);
	}
}
