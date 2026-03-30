package com.valoreon.dto.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DailyRevenueDTO {

	private LocalDate date;
	private BigDecimal totalRevenue;

	public DailyRevenueDTO(LocalDate date, BigDecimal totalRevenue) {
		this.date = date;
		this.totalRevenue = totalRevenue;
	}
}
