package com.valoreon.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.valoreon.model.Printer;
import com.valoreon.model.Production;
import com.valoreon.model.User;

@Repository
public interface ProductionRepository extends JpaRepository<Production, Long> {

	/** Count rows for tenant; compare with {@link #count()} to detect user_id mismatch. */
	long countByUser_Id(Long userId);

	// ── Active (ACTIVE status) cursor pagination ────────────────────────────

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findFirstPageForUser(@Param("userId") Long userId, Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND ("
			+ "p.createdAt < :cursorCreatedAt OR "
			+ "(p.createdAt = :cursorCreatedAt AND p.id < :cursorId)) "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findPageForUserAfterCursor(
			@Param("userId") Long userId,
			@Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
			@Param("cursorId") Long cursorId,
			Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND p.printer.id = :printerId "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findFirstPageForUserAndPrinter(
			@Param("userId") Long userId,
			@Param("printerId") Long printerId,
			Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND p.printer.id = :printerId AND ("
			+ "p.createdAt < :cursorCreatedAt OR "
			+ "(p.createdAt = :cursorCreatedAt AND p.id < :cursorId)) "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findPageForUserAfterCursorAndPrinter(
			@Param("userId") Long userId,
			@Param("printerId") Long printerId,
			@Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
			@Param("cursorId") Long cursorId,
			Pageable pageable);

	// ── Archived (ARCHIVED status) cursor pagination ─────────────────────────

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ARCHIVED' "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findFirstArchivedPageForUser(@Param("userId") Long userId, Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ARCHIVED' AND ("
			+ "p.createdAt < :cursorCreatedAt OR "
			+ "(p.createdAt = :cursorCreatedAt AND p.id < :cursorId)) "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findArchivedPageForUserAfterCursor(
			@Param("userId") Long userId,
			@Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
			@Param("cursorId") Long cursorId,
			Pageable pageable);

	// ── Active + date range cursor pagination ───────────────────────────────

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' "
			+ "AND p.createdAt >= :startDate AND p.createdAt <= :endDate "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findFirstPageForUserInRange(
			@Param("userId") Long userId,
			@Param("startDate") LocalDateTime startDate,
			@Param("endDate") LocalDateTime endDate,
			Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' "
			+ "AND p.createdAt >= :startDate AND p.createdAt <= :endDate AND ("
			+ "p.createdAt < :cursorCreatedAt OR "
			+ "(p.createdAt = :cursorCreatedAt AND p.id < :cursorId)) "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findPageForUserAfterCursorInRange(
			@Param("userId") Long userId,
			@Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
			@Param("cursorId") Long cursorId,
			@Param("startDate") LocalDateTime startDate,
			@Param("endDate") LocalDateTime endDate,
			Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND p.printer.id = :printerId "
			+ "AND p.createdAt >= :startDate AND p.createdAt <= :endDate "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findFirstPageForUserAndPrinterInRange(
			@Param("userId") Long userId,
			@Param("printerId") Long printerId,
			@Param("startDate") LocalDateTime startDate,
			@Param("endDate") LocalDateTime endDate,
			Pageable pageable);

	@EntityGraph(attributePaths = { "printer" })
	@Query("SELECT p FROM Production p WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND p.printer.id = :printerId "
			+ "AND p.createdAt >= :startDate AND p.createdAt <= :endDate AND ("
			+ "p.createdAt < :cursorCreatedAt OR "
			+ "(p.createdAt = :cursorCreatedAt AND p.id < :cursorId)) "
			+ "ORDER BY p.createdAt DESC, p.id DESC")
	List<Production> findPageForUserAfterCursorAndPrinterInRange(
			@Param("userId") Long userId,
			@Param("printerId") Long printerId,
			@Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
			@Param("cursorId") Long cursorId,
			@Param("startDate") LocalDateTime startDate,
			@Param("endDate") LocalDateTime endDate,
			Pageable pageable);

	// ── General lookups ──────────────────────────────────────────────────────

	@Query("SELECT p FROM Production p JOIN FETCH p.printer WHERE p.user.id = :userId AND p.status = 'ACTIVE'")
	List<Production> findAllByUserId(@Param("userId") Long userId);

	@Query("SELECT p FROM Production p JOIN FETCH p.printer WHERE p.user.id = :userId "
			+ "AND p.status = 'ACTIVE' "
			+ "AND p.createdAt >= :startInclusive AND p.createdAt < :endExclusive")
	List<Production> findAllByUserIdAndCreatedAtRange(
			@Param("userId") Long userId,
			@Param("startInclusive") LocalDateTime startInclusive,
			@Param("endExclusive") LocalDateTime endExclusive);

	default List<Production> findByUser(User user) {
		return findAllByUserId(user.getId());
	}

	default List<Production> findAllByUser(User user) {
		return findAllByUserId(user.getId());
	}

	default List<Production> findAllWithPrinterByUser(User user) {
		return findAllByUserId(user.getId());
	}

	/** Loads by primary key only if {@code p.user.id} matches (tenant isolation). */
	@Query("SELECT p FROM Production p JOIN FETCH p.printer WHERE p.id = :id AND p.user.id = :userId")
	Optional<Production> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

	default Optional<Production> findByIdAndUser(Long id, User user) {
		return findByIdAndUserId(id, user.getId());
	}

	@Query("SELECT p FROM Production p JOIN FETCH p.printer WHERE p.printer.id = :printerId AND p.user.id = :userId AND p.status = 'ACTIVE'")
	List<Production> findAllByPrinterIdAndUserId(@Param("printerId") Long printerId, @Param("userId") Long userId);

	default List<Production> findAllByPrinterIdAndUser(Long printerId, User user) {
		return findAllByPrinterIdAndUserId(printerId, user.getId());
	}

	List<Production> findByPrinter(Printer printer);

	/**
	 * Line revenue = {@code salePrice * quantity} (no {@code revenue} column on {@link Production}).
	 */
	@Query("""
			SELECT CAST(p.createdAt AS date), COALESCE(SUM(p.salePrice * p.quantity), 0)
			FROM Production p
			WHERE p.user.id = :userId
			AND p.status = 'ACTIVE'
			AND p.createdAt >= :startDate
			GROUP BY CAST(p.createdAt AS date)
			ORDER BY CAST(p.createdAt AS date)
			""")
	List<Object[]> getRevenuePerDay(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);

	@Query("""
			SELECT CAST(p.createdAt AS date), COALESCE(SUM(COALESCE(p.quantity, 0)), 0)
			FROM Production p
			WHERE p.user.id = :userId
			AND p.status = 'ACTIVE'
			AND p.createdAt >= :startDate
			GROUP BY CAST(p.createdAt AS date)
			ORDER BY CAST(p.createdAt AS date)
			""")
	List<Object[]> getProductionPerDay(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);

	/**
	 * Aggregates all ACTIVE productions for the user.
	 */
	@Query("""
			SELECT COALESCE(SUM(COALESCE(p.salePrice * p.quantity, 0)), 0) AS totalRevenue,
			       COALESCE(SUM(COALESCE(p.totalCost, 0)), 0) AS totalCost,
			       COALESCE(SUM(COALESCE(p.quantity, 0)), 0) AS totalPieces
			FROM Production p
			WHERE p.user.id = :userId
			AND p.status = 'ACTIVE'
			""")
	ProductionMetricsProjection getMetrics(@Param("userId") Long userId);

	/** Debug only: equivalent to {@code SELECT id, user_id FROM productions ORDER BY id}. */
	@Query("SELECT p.id, p.user.id FROM Production p ORDER BY p.id")
	List<Object[]> findAllIdAndUserId();

	/**
	 * Aggregates revenue, cost and profit per printer for the given user (ACTIVE only).
	 */
	@Query("""
			SELECT p.printer.id, p.printer.name,
			       COALESCE(SUM(COALESCE(p.salePrice * p.quantity, 0)), 0),
			       COALESCE(SUM(COALESCE(p.totalCost, 0)), 0),
			       COALESCE(SUM(COALESCE(p.profit, 0)), 0)
			FROM Production p
			WHERE p.user.id = :userId
			AND p.status = 'ACTIVE'
			GROUP BY p.printer.id, p.printer.name
			ORDER BY SUM(COALESCE(p.profit, 0)) DESC
			""")
	List<Object[]> getProfitByPrinter(@Param("userId") Long userId);

	/** All ACTIVE productions for the user created on or after {@code since}. */
	@Query("SELECT p FROM Production p JOIN FETCH p.printer WHERE p.user.id = :userId "
			+ "AND p.status = 'ACTIVE' AND p.createdAt >= :since")
	List<Production> findAllByUserIdSince(
			@Param("userId") Long userId,
			@Param("since") LocalDateTime since);

	/**
	 * Like {@link #getProfitByPrinter} but filtered to productions created on or after {@code since}.
	 */
	@Query("""
			SELECT p.printer.id, p.printer.name,
			       COALESCE(SUM(COALESCE(p.salePrice * p.quantity, 0)), 0),
			       COALESCE(SUM(COALESCE(p.totalCost, 0)), 0),
			       COALESCE(SUM(COALESCE(p.profit, 0)), 0)
			FROM Production p
			WHERE p.user.id = :userId
			AND p.status = 'ACTIVE'
			AND p.createdAt >= :since
			GROUP BY p.printer.id, p.printer.name
			ORDER BY SUM(COALESCE(p.profit, 0)) DESC
			""")
	List<Object[]> getProfitByPrinterSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
