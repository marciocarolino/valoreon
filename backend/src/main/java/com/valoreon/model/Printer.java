package com.valoreon.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.valoreon.model.enums.PrinterStatus;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "printers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Printer {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false)
	private String name;

	@Column(name = "brand", nullable = false)
	private String brand;

	@Column(name = "power_consumption_watts", nullable = false)
	private Integer powerConsumptionWatts;

	@Column(name = "energy_cost_per_kwh", precision = 10, scale = 4, nullable = false)
	private BigDecimal energyCostPerKwh;

	@Column(name = "cost_per_hour", precision = 10, scale = 4)
	private BigDecimal costPerHour;

	@JdbcTypeCode(SqlTypes.NAMED_ENUM)
	@Column(name = "status", nullable = false, columnDefinition = "printer_status")
	private PrinterStatus status = PrinterStatus.ACTIVE;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@JsonBackReference
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

	@PrePersist
	public void prePersist() {
		this.createdAt = LocalDateTime.now();
		this.status = this.status != null ? this.status : PrinterStatus.ACTIVE;
		recalculateCostPerHour();
	}

	@PreUpdate
	public void preUpdate() {
		this.updatedAt = LocalDateTime.now();
		recalculateCostPerHour();
	}

	private void recalculateCostPerHour() {
		if (this.powerConsumptionWatts != null && this.energyCostPerKwh != null) {
			this.costPerHour = BigDecimal.valueOf(this.powerConsumptionWatts)
					.divide(BigDecimal.valueOf(1000), 10, RoundingMode.HALF_UP)
					.multiply(this.energyCostPerKwh)
					.setScale(4, RoundingMode.HALF_UP);
		}
	}
}
