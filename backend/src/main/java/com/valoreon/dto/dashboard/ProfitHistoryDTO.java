package com.valoreon.dto.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;

@Getter
public class ProfitHistoryDTO {

	private final LocalDate date;
	private final BigDecimal profit;

	public ProfitHistoryDTO(LocalDate date, BigDecimal profit) {
		this.date = date;
		this.profit = profit;
	}
}
