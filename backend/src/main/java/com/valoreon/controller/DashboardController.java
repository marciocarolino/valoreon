package com.valoreon.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.valoreon.dto.dashboard.DashboardChartDTO;
import com.valoreon.dto.dashboard.DashboardMetricsDTO;
import com.valoreon.dto.dashboard.DashboardSummaryDTO;
import com.valoreon.dto.dashboard.DashboardWeekKpiDTO;
import com.valoreon.dto.dashboard.PrinterProfitDTO;
import com.valoreon.dto.dashboard.ProfitHistoryDTO;
import com.valoreon.dto.dashboard.TodayMetricsDTO;
import com.valoreon.security.TenantUserDetails;
import com.valoreon.service.DashboardService;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

	private final DashboardService dashboardService;

	public DashboardController(DashboardService dashboardService) {
		this.dashboardService = dashboardService;
	}

	@GetMapping("/summary")
	public DashboardSummaryDTO getSummary(Authentication authentication) {
		TenantUserDetails principal = (TenantUserDetails) authentication.getPrincipal();
		return dashboardService.getSummary(principal.getUserId());
	}

	@GetMapping("/metrics")
	public DashboardMetricsDTO getMetrics(Authentication authentication) {
		TenantUserDetails principal = (TenantUserDetails) authentication.getPrincipal();
		return dashboardService.getMetrics(principal.getUserId());
	}

	@GetMapping("/chart")
	public DashboardChartDTO getChart(
			Authentication authentication,
			@RequestParam(defaultValue = "15") int days) {
		TenantUserDetails principal = (TenantUserDetails) authentication.getPrincipal();
		return dashboardService.getChartData(principal.getUserId(), days);
	}

	/** KPI metrics for the last {@code days} calendar days (default 15). */
	@GetMapping("/week")
	public DashboardWeekKpiDTO getWeekKpi(
			@RequestParam(defaultValue = "15") int days) {
		return dashboardService.getWeekKpi(days);
	}

	@GetMapping("/today")
	public TodayMetricsDTO getToday() {
		return dashboardService.getTodayMetrics();
	}

	@GetMapping("/profit-history")
	public List<ProfitHistoryDTO> getProfitHistory() {
		return dashboardService.getProfitHistory();
	}

	@GetMapping("/printers-profit")
	public List<PrinterProfitDTO> getPrintersProfit(
			@RequestParam(defaultValue = "15") int days) {
		return dashboardService.getPrinterProfit(days);
	}
}
