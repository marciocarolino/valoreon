package com.valoreon.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.printer.PrinterCreateDTO;
import com.valoreon.dto.printer.PrinterFinancialSummaryDTO;
import com.valoreon.dto.printer.PrinterResponseDTO;
import com.valoreon.dto.printer.UpdatePrinterDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.Printer;
import com.valoreon.model.Production;
import com.valoreon.model.User;
import com.valoreon.model.enums.PrinterStatus;
import com.valoreon.repository.MaintenanceRepository;
import com.valoreon.repository.PrinterRepository;
import com.valoreon.repository.ProductionRepository;

@Service
public class PrinterService {

	private final PrinterRepository printerRepository;
	private final ProductionRepository productionRepository;
	private final CurrentUserService currentUserService;
	private final MaintenanceRepository maintenanceRepository;

	public PrinterService(
			PrinterRepository printerRepository,
			ProductionRepository productionRepository,
			CurrentUserService currentUserService,
			MaintenanceRepository maintenanceRepository) {
		this.printerRepository = printerRepository;
		this.productionRepository = productionRepository;
		this.currentUserService = currentUserService;
		this.maintenanceRepository = maintenanceRepository;
	}

	@Transactional(readOnly = true)
	public PrinterFinancialSummaryDTO getPrinterSummary(Long printerId) {
		User user = currentUserService.getCurrentUser();
		Long userId = user.getId();
		printerRepository.findByIdAndUser(printerId, user)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));

		List<Production> productions = productionRepository.findAllByPrinterIdAndUserId(printerId, userId);

		BigDecimal revenue = BigDecimal.ZERO;
		BigDecimal cost = BigDecimal.ZERO;
		BigDecimal profit = BigDecimal.ZERO;
		long totalPieces = 0L;

		for (Production p : productions) {
			if (p.getQuantity() != null) {
				totalPieces += p.getQuantity();
			}
			if (p.getSalePrice() != null && p.getQuantity() != null) {
				revenue = revenue.add(p.getSalePrice().multiply(BigDecimal.valueOf(p.getQuantity())));
			}
			if (p.getTotalCost() != null) {
				cost = cost.add(p.getTotalCost());
			}
			if (p.getProfit() != null) {
				profit = profit.add(p.getProfit());
			}
		}

		return PrinterFinancialSummaryDTO.builder()
				.revenue(revenue)
				.cost(cost)
				.profit(profit)
				.totalProductions(totalPieces)
				.build();
	}

	@Transactional(readOnly = true)
	public PrinterResponseDTO findById(Long id) {
		User user = currentUserService.getCurrentUser();
		Printer printer = printerRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
		return toResponseDTO(printer);
	}

	@Transactional(readOnly = true)
	public List<PrinterResponseDTO> listForCurrentUser() {
		User user = currentUserService.getCurrentUser();
		return printerRepository.findByUser(user).stream()
				.map(this::toResponseDTO)
				.toList();
	}

	@Transactional
	public PrinterResponseDTO createPrinter(PrinterCreateDTO dto) {
		User user = currentUserService.getCurrentUser();

		Printer printer = new Printer();
		printer.setName(dto.getName());
		printer.setBrand(dto.getBrand());
		printer.setPowerConsumptionWatts(dto.getPowerConsumptionWatts());
		printer.setEnergyCostPerKwh(dto.getEnergyCostPerKwh());
		printer.setStatus(dto.getStatus());
		printer.setUser(user);

		if (printer.getStatus() == null) {
			printer.setStatus(PrinterStatus.ACTIVE);
		}

		return toResponseDTO(printerRepository.save(printer));
	}

	@Transactional
	public PrinterResponseDTO updatePrinter(Long id, UpdatePrinterDTO dto) {
		User user = currentUserService.getCurrentUser();
		Printer printer = printerRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));

		if (dto.getName() != null && !dto.getName().isBlank()) {
			printer.setName(dto.getName());
		}
		if (dto.getBrand() != null && !dto.getBrand().isBlank()) {
			printer.setBrand(dto.getBrand());
		}
		if (dto.getPowerConsumptionWatts() != null) {
			printer.setPowerConsumptionWatts(dto.getPowerConsumptionWatts());
		}
		if (dto.getEnergyCostPerKwh() != null) {
			printer.setEnergyCostPerKwh(dto.getEnergyCostPerKwh());
		}
		if (dto.getStatus() != null) {
			if (dto.getStatus() != PrinterStatus.MAINTENANCE
					&& maintenanceRepository.existsInProgressMaintenance(printer.getId(), user.getId())) {
				throw new ApiException(
						"Impressora possui manutenção ativa e não pode ter o status alterado",
						HttpStatus.BAD_REQUEST);
			}
			printer.setStatus(dto.getStatus());
		}

		if (printer.getStatus() == null) {
			printer.setStatus(PrinterStatus.ACTIVE);
		}

		return toResponseDTO(printerRepository.save(printer));
	}

	@Transactional
	public void deletePrinter(Long id) {
		User user = currentUserService.getCurrentUser();
		Printer printer = printerRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
		printerRepository.delete(printer);
	}

	private PrinterResponseDTO toResponseDTO(Printer p) {
		return PrinterResponseDTO.builder()
				.id(p.getId())
				.name(p.getName())
				.brand(p.getBrand())
				.powerConsumptionWatts(p.getPowerConsumptionWatts())
				.energyCostPerKwh(p.getEnergyCostPerKwh())
				.costPerHour(p.getCostPerHour())
				.status(p.getStatus())
				.createdAt(p.getCreatedAt())
				.updatedAt(p.getUpdatedAt())
				.build();
	}
}
