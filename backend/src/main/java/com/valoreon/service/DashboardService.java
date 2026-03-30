package com.valoreon.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.dashboard.DailyProductionDTO;
import com.valoreon.dto.dashboard.DailyRevenueDTO;
import com.valoreon.dto.dashboard.DashboardChartDTO;
import com.valoreon.dto.dashboard.DashboardMetricsDTO;
import com.valoreon.dto.dashboard.DashboardSummaryDTO;
import com.valoreon.dto.dashboard.DashboardWeekKpiDTO;
import com.valoreon.dto.dashboard.PrinterProfitDTO;
import com.valoreon.dto.dashboard.ProfitHistoryDTO;
import com.valoreon.dto.dashboard.TodayMetricsDTO;
import com.valoreon.model.Maintenance;
import com.valoreon.model.Printer;
import com.valoreon.model.Production;
import com.valoreon.model.enums.PrinterStatus;
import com.valoreon.repository.MaintenanceRepository;
import com.valoreon.repository.PrinterRepository;
import com.valoreon.repository.ProductionMetricsProjection;
import com.valoreon.repository.ProductionRepository;

@Service
public class DashboardService {

	private static final int SUMMARY_DAYS = 14;

	private final ProductionRepository productionRepository;
	private final PrinterRepository printerRepository;
	private final MaintenanceRepository maintenanceRepository;
	private final CurrentUserService currentUserService;

	public DashboardService(ProductionRepository productionRepository, PrinterRepository printerRepository,
			MaintenanceRepository maintenanceRepository, CurrentUserService currentUserService) {
		this.productionRepository = productionRepository;
		this.printerRepository = printerRepository;
		this.maintenanceRepository = maintenanceRepository;
		this.currentUserService = currentUserService;
	}

	/**
	 * Last 14 calendar days (inclusive of today): revenue and production count per
	 * day, zeros filled.
	 */
	@Transactional(readOnly = true)
	public DashboardSummaryDTO getSummary(Long userId) {
		LocalDate today = LocalDate.now();
		LocalDate startDate = today.minusDays(SUMMARY_DAYS - 1);
		LocalDateTime startDateTime = startDate.atStartOfDay();

		List<Object[]> revenueRaw = productionRepository.getRevenuePerDay(userId, startDateTime);
		List<Object[]> productionRaw = productionRepository.getProductionPerDay(userId, startDateTime);

		Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
		for (Object[] obj : revenueRaw) {
			LocalDate date = toLocalDateKey(obj[0]);
			BigDecimal value = toBigDecimal(obj[1]);
			revenueMap.put(date, value);
		}

		Map<LocalDate, Long> productionMap = new HashMap<>();
		for (Object[] obj : productionRaw) {
			LocalDate date = toLocalDateKey(obj[0]);
			Long value = toLong(obj[1]);
			productionMap.put(date, value);
		}

		List<DailyRevenueDTO> revenueList = new ArrayList<>();
		List<DailyProductionDTO> productionList = new ArrayList<>();

		for (LocalDate date = startDate; !date.isAfter(today); date = date.plusDays(1)) {
			revenueList.add(new DailyRevenueDTO(date,
					revenueMap.getOrDefault(date, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP)));
			productionList.add(new DailyProductionDTO(date, productionMap.getOrDefault(date, 0L)));
		}

		return new DashboardSummaryDTO(revenueList, productionList);
	}

	@Transactional(readOnly = true)
	public DashboardMetricsDTO getMetrics(Long userId) {
		List<Printer> printers = printerRepository.findByUserId(userId);
		long activePrinters = countByStatus(printers, PrinterStatus.ACTIVE);
		long inactivePrinters = countByStatus(printers, PrinterStatus.INACTIVE);
		long maintenancePrinters = countByStatus(printers, PrinterStatus.MAINTENANCE);

		ProductionMetricsProjection m = productionRepository.getMetrics(userId);

		if (m == null) {
			return new DashboardMetricsDTO(BigDecimal.ZERO, BigDecimal.ZERO, 0L,
					activePrinters, inactivePrinters, maintenancePrinters);
		}
		BigDecimal revenue = m.getTotalRevenue() != null ? m.getTotalRevenue() : BigDecimal.ZERO;
		BigDecimal productionCost = m.getTotalCost() != null ? m.getTotalCost() : BigDecimal.ZERO;
		BigDecimal maintenanceCost = sumMaintenanceCosts(maintenanceRepository.findByUserId(userId));
		BigDecimal cost = productionCost.add(maintenanceCost);
		Long totalPieces = m.getTotalPieces() != null ? m.getTotalPieces() : 0L;
		return new DashboardMetricsDTO(revenue, cost, totalPieces,
				activePrinters, inactivePrinters, maintenancePrinters);
	}

	private static LocalDate toLocalDateKey(Object value) {
		if (value instanceof java.sql.Date d) {
			return d.toLocalDate();
		}
		if (value instanceof LocalDate ld) {
			return ld;
		}
		if (value instanceof java.util.Date ud) {
			return new java.sql.Date(ud.getTime()).toLocalDate();
		}
		return LocalDate.parse(value.toString());
	}

	private static BigDecimal toBigDecimal(Object value) {
		if (value == null) {
			return BigDecimal.ZERO;
		}
		if (value instanceof Object[]) {
			throw new IllegalArgumentException(
					"Expected scalar for BigDecimal; got Object[]. Use indexed access (e.g. result[0]), not the whole row.");
		}
		if (value instanceof BigDecimal bd) {
			return bd;
		}
		if (value instanceof Number num) {
			return BigDecimal.valueOf(num.doubleValue());
		}
		throw new IllegalArgumentException("Invalid number type: " + value.getClass());
	}

	private static long toLong(Object value) {
		if (value == null) {
			return 0L;
		}
		if (value instanceof Number n) {
			return n.longValue();
		}
		throw new IllegalArgumentException("Invalid count type: " + value.getClass());
	}

	/**
	 * Summary metrics for the last {@code days} calendar days
	 * (createdAt &gt;= NOW() - days).
	 */
	@Transactional(readOnly = true)
	public DashboardWeekKpiDTO getWeekKpi(int days) {
		Long userId = currentUserService.getCurrentUser().getId();

		List<Printer> printers = printerRepository.findByUserId(userId);

		long activePrinters = countByStatus(printers, PrinterStatus.ACTIVE);
		long inactivePrinters = countByStatus(printers, PrinterStatus.INACTIVE);
		long maintenancePrinters = countByStatus(printers, PrinterStatus.MAINTENANCE);

		LocalDateTime since = LocalDateTime.now().minusDays(days);
		LocalDate sinceDate = since.toLocalDate();
		LocalDate tomorrow = LocalDate.now().plusDays(1);

		List<Maintenance> maintenancesInPeriod = maintenanceRepository.findAllForUserIdAndMaintenanceDateRange(userId,
				sinceDate, tomorrow);
		BigDecimal maintenanceCost = sumMaintenanceCosts(maintenancesInPeriod);

		List<Production> productionsInPeriod = productionRepository.findAllByUserIdSince(userId, since);

		if (productionsInPeriod.isEmpty()) {
			return emptyWeekSummary(activePrinters, inactivePrinters, maintenancePrinters, maintenanceCost);
		}

		return summarizeFromProductions(productionsInPeriod, maintenanceCost, activePrinters, inactivePrinters,
				maintenancePrinters);
	}

	/**
	 * Returns three parallel arrays (labels, revenue, productions) for the last
	 * {@code days} calendar days, with zeros on days that have no data.
	 * Minimum 1 day, maximum 90 days.
	 */
	@Transactional(readOnly = true)
	public DashboardChartDTO getChartData(Long userId, int days) {
		int window = Math.max(1, Math.min(days, 90));
		LocalDate today = LocalDate.now();
		LocalDate startDate = today.minusDays(window - 1);
		LocalDateTime startDateTime = startDate.atStartOfDay();

		List<Object[]> revenueRaw = productionRepository.getRevenuePerDay(userId, startDateTime);
		List<Object[]> productionRaw = productionRepository.getProductionPerDay(userId, startDateTime);

		Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
		for (Object[] row : revenueRaw) {
			revenueMap.put(toLocalDateKey(row[0]), toBigDecimal(row[1]));
		}

		Map<LocalDate, Long> productionMap = new HashMap<>();
		for (Object[] row : productionRaw) {
			productionMap.put(toLocalDateKey(row[0]), toLong(row[1]));
		}

		List<String> labels = new ArrayList<>(window);
		List<BigDecimal> revenue = new ArrayList<>(window);
		List<Long> productions = new ArrayList<>(window);

		for (LocalDate date = startDate; !date.isAfter(today); date = date.plusDays(1)) {
			labels.add(date.toString());
			revenue.add(revenueMap.getOrDefault(date, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
			productions.add(productionMap.getOrDefault(date, 0L));
		}

		return new DashboardChartDTO(labels, revenue, productions);
	}

	/**
	 * Returns all printers that have at least one production for the current user
	 * within the last {@code days} calendar days, each with aggregated revenue,
	 * cost and profit. Ordered by totalProfit DESC so index 0 = most profitable.
	 */
	@Transactional(readOnly = true)
	public List<PrinterProfitDTO> getPrinterProfit(int days) {
		Long userId = currentUserService.getCurrentUser().getId();
		LocalDateTime since = LocalDateTime.now().minusDays(days);
		List<Object[]> rows = productionRepository.getProfitByPrinterSince(userId, since);
		List<PrinterProfitDTO> result = new ArrayList<>(rows.size());
		for (Object[] row : rows) {
			Long printerId   = ((Number) row[0]).longValue();
			String name      = (String) row[1];
			BigDecimal rev   = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
			BigDecimal cost  = toBigDecimal(row[3]).setScale(2, RoundingMode.HALF_UP);
			BigDecimal profit = toBigDecimal(row[4]).setScale(2, RoundingMode.HALF_UP);
			result.add(new PrinterProfitDTO(printerId, name, rev, cost, profit));
		}
		return result;
	}

	@Transactional(readOnly = true)
	public TodayMetricsDTO getTodayMetrics() {
		Long userId = currentUserService.getCurrentUser().getId();
		LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
		List<Production> todayProductions = productionRepository.findAllByUserIdSince(userId, startOfDay);

		BigDecimal revenue = BigDecimal.ZERO;
		BigDecimal cost = BigDecimal.ZERO;

		for (Production p : todayProductions) {
			if (p.getSalePrice() != null && p.getQuantity() != null) {
				revenue = revenue.add(p.getSalePrice().multiply(BigDecimal.valueOf(p.getQuantity())));
			}
			if (p.getTotalCost() != null) {
				cost = cost.add(p.getTotalCost());
			}
		}

		BigDecimal profit = revenue.subtract(cost);
		return new TodayMetricsDTO(
				revenue.setScale(2, RoundingMode.HALF_UP),
				cost.setScale(2, RoundingMode.HALF_UP),
				profit.setScale(2, RoundingMode.HALF_UP),
				todayProductions.size());
	}

	@Transactional(readOnly = true)
	public List<ProfitHistoryDTO> getProfitHistory() {
		Long userId = currentUserService.getCurrentUser().getId();

		return productionRepository.findAllByUserId(userId).stream()
				.filter(p -> p.getCreatedAt() != null && p.getProfit() != null)
				.collect(Collectors.groupingBy(p -> p.getCreatedAt().toLocalDate(),
						Collectors.mapping(p -> p.getProfit(), Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))))
				.entrySet().stream().map(e -> new ProfitHistoryDTO(e.getKey(), e.getValue()))
				.sorted(Comparator.comparing(ProfitHistoryDTO::getDate)).toList();
	}

	private static BigDecimal sumMaintenanceCosts(List<Maintenance> maintenances) {
		return maintenances.stream().map(Maintenance::getCost).filter(c -> c != null).reduce(BigDecimal.ZERO,
				BigDecimal::add);
	}

private DashboardWeekKpiDTO emptyWeekSummary(long activePrinters, long inactivePrinters, long maintenancePrinters,
			BigDecimal maintenanceCost) {

		BigDecimal revenue = BigDecimal.ZERO;
		BigDecimal cost = maintenanceCost != null ? maintenanceCost : BigDecimal.ZERO;
		BigDecimal profit = revenue.subtract(cost);

		return DashboardWeekKpiDTO.builder().totalRevenue(revenue.setScale(2, RoundingMode.HALF_UP))
				.totalCost(cost.setScale(2, RoundingMode.HALF_UP)).totalProfit(profit.setScale(2, RoundingMode.HALF_UP))
				.totalPrints(0L).totalEnergyKwh(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP))
				.activePrinters(activePrinters).inactivePrinters(inactivePrinters)
				.maintenancePrinters(maintenancePrinters).build();
	}

	private long countByStatus(List<Printer> printers, PrinterStatus status) {
		return printers.stream().filter(p -> status.equals(p.getStatus())).count();
	}

	private DashboardWeekKpiDTO summarizeFromProductions(List<Production> productions, BigDecimal maintenanceCost,
			long activePrinters, long inactivePrinters, long maintenancePrinters) {

		BigDecimal totalRevenue = BigDecimal.ZERO;
		BigDecimal productionCost = BigDecimal.ZERO;
		BigDecimal totalEnergyKwh = BigDecimal.ZERO;
		long totalPiecesProduced = 0L;

		for (Production p : productions) {
			if (p.getQuantity() != null) {
				totalPiecesProduced += p.getQuantity();
			}
			if (p.getSalePrice() != null && p.getQuantity() != null) {
				totalRevenue = totalRevenue.add(p.getSalePrice().multiply(BigDecimal.valueOf(p.getQuantity())));
			}
			if (p.getTotalCost() != null) {
				productionCost = productionCost.add(p.getTotalCost());
			}
			if (p.getPrinter() != null && p.getPrintTimeHours() != null
					&& p.getPrinter().getPowerConsumptionWatts() != null && p.getPrinter().getEnergyCostPerKwh() != null
					&& p.getQuantity() != null) {

				BigDecimal energyKwhPerUnit = BigDecimal.valueOf(p.getPrinter().getPowerConsumptionWatts())
						.divide(BigDecimal.valueOf(1000), 10, RoundingMode.HALF_UP)
						.multiply(BigDecimal.valueOf(p.getPrintTimeHours())).setScale(4, RoundingMode.HALF_UP);

				BigDecimal energyKwh = energyKwhPerUnit.multiply(BigDecimal.valueOf(p.getQuantity()));

				totalEnergyKwh = totalEnergyKwh.add(energyKwh);
			}
		}

		BigDecimal maint = maintenanceCost != null ? maintenanceCost : BigDecimal.ZERO;
		BigDecimal totalCost = productionCost.add(maint);
		BigDecimal totalProfit = totalRevenue.subtract(totalCost);

		return DashboardWeekKpiDTO.builder().totalRevenue(totalRevenue.setScale(2, RoundingMode.HALF_UP))
				.totalCost(totalCost.setScale(2, RoundingMode.HALF_UP))
				.totalProfit(totalProfit.setScale(2, RoundingMode.HALF_UP)).totalPrints(totalPiecesProduced)
				.totalEnergyKwh(totalEnergyKwh.setScale(4, RoundingMode.HALF_UP)).activePrinters(activePrinters)
				.inactivePrinters(inactivePrinters).maintenancePrinters(maintenancePrinters).build();
	}
}
