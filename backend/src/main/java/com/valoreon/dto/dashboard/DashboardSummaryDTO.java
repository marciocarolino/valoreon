package com.valoreon.dto.dashboard;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {

	private List<DailyRevenueDTO> revenuePerDay;
	private List<DailyProductionDTO> productionPerDay;
}
