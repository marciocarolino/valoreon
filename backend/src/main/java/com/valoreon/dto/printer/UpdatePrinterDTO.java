package com.valoreon.dto.printer;

import java.math.BigDecimal;

import com.valoreon.model.enums.PrinterStatus;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdatePrinterDTO {

	private String name;
	private String brand;
	private Integer powerConsumptionWatts;
	private BigDecimal energyCostPerKwh;
	private PrinterStatus status;
}
