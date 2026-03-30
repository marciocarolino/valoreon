package com.valoreon.dto.dashboard;

import java.time.LocalDate;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DailyProductionDTO {

	private LocalDate date;
	private Long totalProductions;

	public DailyProductionDTO(LocalDate date, Long totalProductions) {
		this.date = date;
		this.totalProductions = totalProductions;
	}
}
