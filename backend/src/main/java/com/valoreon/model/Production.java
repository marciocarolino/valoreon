package com.valoreon.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.valoreon.model.enums.ProductionStatus;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "productions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Production {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false)
	private String name;

	@Column(name = "weight", nullable = false)
	private Double weight;

	@Column(name = "quantity", nullable = false)
	private Integer quantity;

	@Column(name = "material")
	private String material;

	@Column(name = "color")
	private String color;

	@Column(name = "size")
	private String size;

	@Column(name = "print_time_hours", nullable = false)
	private Double printTimeHours;

	@Column(name = "sale_price", precision = 15, scale = 2, nullable = false)
	private BigDecimal salePrice;

	@Column(name = "filament_price", precision = 15, scale = 4, nullable = false)
	private BigDecimal filamentPrice;

	@Column(name = "material_cost", precision = 15, scale = 4)
	private BigDecimal materialCost;

	@Column(name = "energy_cost", precision = 15, scale = 4)
	private BigDecimal energyCost;

	@Column(name = "total_cost", precision = 15, scale = 4)
	private BigDecimal totalCost;

	@Column(name = "profit", precision = 15, scale = 4)
	private BigDecimal profit;

	@Column(name = "margin", precision = 10, scale = 4)
	private BigDecimal margin;

	@Column(name = "shipping_cost", precision = 15, scale = 2)
	private BigDecimal shippingCost;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private ProductionStatus status = ProductionStatus.ACTIVE;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "printer_id", nullable = false)
	private Printer printer;

	@JsonBackReference
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@PrePersist
	public void prePersist() {
		this.createdAt = LocalDateTime.now();
		if (this.status == null) this.status = ProductionStatus.ACTIVE;
		recalculate();
	}

	@PreUpdate
	public void preUpdate() {
		recalculate();
	}

	/**
	 * Semantics: {@code weight} (g), {@code printTimeHours}, and {@code salePrice} are per unit;
	 * {@code quantity} is the number of units. Line totals scale by {@code quantity}.
	 */
	private void recalculate() {
		if (weight == null || filamentPrice == null || printTimeHours == null
				|| printer == null || printer.getCostPerHour() == null || quantity == null || salePrice == null) {
			return;
		}

		BigDecimal qty = BigDecimal.valueOf(quantity);

		BigDecimal materialCostUnit = BigDecimal.valueOf(weight)
				.divide(BigDecimal.valueOf(1000), 10, RoundingMode.HALF_UP)
				.multiply(filamentPrice)
				.setScale(4, RoundingMode.HALF_UP);

		BigDecimal energyCostUnit = BigDecimal.valueOf(printTimeHours)
				.multiply(printer.getCostPerHour())
				.setScale(4, RoundingMode.HALF_UP);

		this.materialCost = materialCostUnit.multiply(qty).setScale(4, RoundingMode.HALF_UP);
		this.energyCost = energyCostUnit.multiply(qty).setScale(4, RoundingMode.HALF_UP);
		this.totalCost = materialCost.add(energyCost).setScale(4, RoundingMode.HALF_UP);

		BigDecimal totalRevenue = salePrice.multiply(qty);

		BigDecimal shipping = this.shippingCost != null ? this.shippingCost : BigDecimal.ZERO;
		this.profit = totalRevenue.subtract(totalCost).subtract(shipping).setScale(4, RoundingMode.HALF_UP);

		if (totalRevenue.compareTo(BigDecimal.ZERO) != 0) {
			this.margin = profit
					.divide(totalRevenue, 10, RoundingMode.HALF_UP)
					.multiply(BigDecimal.valueOf(100))
					.setScale(4, RoundingMode.HALF_UP);
		}
	}
}
