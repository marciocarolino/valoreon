package com.valoreon.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.production.ProductionCreateDTO;
import com.valoreon.dto.production.ProductionCursorDTO;
import com.valoreon.dto.production.ProductionPageResponseDTO;
import com.valoreon.dto.production.ProductionResponseDTO;
import com.valoreon.dto.production.UpdateProductionDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.Printer;
import com.valoreon.model.Production;
import com.valoreon.model.User;
import com.valoreon.model.enums.PrinterStatus;
import com.valoreon.model.enums.ProductionStatus;
import com.valoreon.repository.PrinterRepository;
import com.valoreon.repository.ProductionRepository;

@Service
public class ProductionService {

	private final ProductionRepository productionRepository;
	private final PrinterRepository printerRepository;
	private final CurrentUserService currentUserService;

	public ProductionService(
			ProductionRepository productionRepository,
			PrinterRepository printerRepository,
			CurrentUserService currentUserService) {
		this.productionRepository = productionRepository;
		this.printerRepository = printerRepository;
		this.currentUserService = currentUserService;
	}

	@Transactional(readOnly = true)
	public ProductionPageResponseDTO listForCurrentUserCursor(
			LocalDateTime cursorCreatedAt,
			Long cursorId,
			Long printerId,
			int limit,
			LocalDateTime startDate,
			LocalDateTime endDate) {
		User user = currentUserService.getCurrentUser();
		Long userId = user.getId();

		if ((cursorCreatedAt == null) != (cursorId == null)) {
			throw new ApiException("cursorCreatedAt and cursorId must both be provided or both omitted",
					HttpStatus.BAD_REQUEST);
		}

		if (printerId != null) {
			printerRepository.findByIdAndUser(printerId, user)
					.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
		}

		int pageSize = Math.min(Math.max(limit, 1), 100);
		int fetchSize = pageSize + 1;
		Pageable pageable = PageRequest.of(0, fetchSize);

		boolean hasDateFilter = startDate != null && endDate != null;

		List<Production> rows;
		if (!hasDateFilter) {
			if (printerId == null) {
				rows = cursorCreatedAt == null
						? productionRepository.findFirstPageForUser(userId, pageable)
						: productionRepository.findPageForUserAfterCursor(userId, cursorCreatedAt, cursorId, pageable);
			} else {
				rows = cursorCreatedAt == null
						? productionRepository.findFirstPageForUserAndPrinter(userId, printerId, pageable)
						: productionRepository.findPageForUserAfterCursorAndPrinter(
								userId, printerId, cursorCreatedAt, cursorId, pageable);
			}
		} else {
			if (printerId == null) {
				rows = cursorCreatedAt == null
						? productionRepository.findFirstPageForUserInRange(userId, startDate, endDate, pageable)
						: productionRepository.findPageForUserAfterCursorInRange(
								userId, cursorCreatedAt, cursorId, startDate, endDate, pageable);
			} else {
				rows = cursorCreatedAt == null
						? productionRepository.findFirstPageForUserAndPrinterInRange(
								userId, printerId, startDate, endDate, pageable)
						: productionRepository.findPageForUserAfterCursorAndPrinterInRange(
								userId, printerId, cursorCreatedAt, cursorId, startDate, endDate, pageable);
			}
		}

		boolean hasNext = rows.size() > pageSize;
		List<Production> page = hasNext ? rows.subList(0, pageSize) : rows;

		List<ProductionResponseDTO> items = page.stream()
				.map(this::toResponseDTO)
				.toList();

		ProductionCursorDTO nextCursor = null;
		if (hasNext && !items.isEmpty()) {
			ProductionResponseDTO last = items.get(items.size() - 1);
			nextCursor = new ProductionCursorDTO(last.getCreatedAt(), last.getId());
		}

		return ProductionPageResponseDTO.builder()
				.items(items)
				.nextCursor(nextCursor)
				.hasNext(hasNext)
				.build();
	}

	@Transactional(readOnly = true)
	public List<ProductionResponseDTO> findByPrinterForCurrentUser(Long printerId) {
		User user = currentUserService.getCurrentUser();
		return productionRepository.findAllByPrinterIdAndUser(printerId, user).stream()
				.map(this::toResponseDTO)
				.toList();
	}

	@Transactional(readOnly = true)
	public ProductionResponseDTO findById(Long id) {
		User user = currentUserService.getCurrentUser();
		Production production = productionRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Production not found", HttpStatus.NOT_FOUND));
		return toResponseDTO(production);
	}

	@Transactional
	public ProductionResponseDTO createProduction(ProductionCreateDTO dto) {
		User currentUser = currentUserService.getCurrentUser();

		Printer printer = printerRepository.findByIdAndUser(dto.getPrinterId(), currentUser)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));

		if (printer.getStatus() == null || !PrinterStatus.ACTIVE.equals(printer.getStatus())) {
			throw new ApiException("Printer is not active", HttpStatus.UNPROCESSABLE_ENTITY);
		}

		if (printer.getCostPerHour() == null) {
			throw new ApiException("Printer has no cost per hour configured", HttpStatus.UNPROCESSABLE_ENTITY);
		}

		Production production = new Production();
		production.setName(dto.getName());
		production.setWeight(dto.getWeight());
		production.setQuantity(dto.getQuantity());
		production.setMaterial(dto.getMaterial());
		production.setColor(dto.getColor());
		production.setSize(dto.getSize());
		production.setPrintTimeHours(dto.getPrintTimeHours());
		production.setSalePrice(dto.getSalePrice());
		production.setFilamentPrice(dto.getFilamentPrice());
		production.setShippingCost(dto.getShippingCost());
		production.setSalesChannel(dto.getSalesChannel() != null ? dto.getSalesChannel() : "DIRECT");
		production.setFeePercentage(dto.getFeePercentage() != null ? dto.getFeePercentage() : java.math.BigDecimal.ZERO);
		production.setPrinter(printer);
		production.setUser(currentUser);

		if (production.getUser() == null) {
			throw new ApiException("User not set in production", HttpStatus.INTERNAL_SERVER_ERROR);
		}

		Production saved = productionRepository.save(production);
		if (saved.getSalePrice() == null || saved.getQuantity() == null) {
			throw new ApiException("salePrice and quantity must be persisted", HttpStatus.INTERNAL_SERVER_ERROR);
		}
		if (saved.getTotalCost() == null) {
			throw new ApiException(
					"totalCost was not computed; ensure printer has cost per hour and weight, filament, print time, sale price, and quantity are set",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}

		return toResponseDTO(saved);
	}

	@Transactional
	public ProductionResponseDTO updateProduction(Long id, UpdateProductionDTO dto) {
		User user = currentUserService.getCurrentUser();
		Production production = productionRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Production not found", HttpStatus.NOT_FOUND));

		if (dto.getName() != null && !dto.getName().isBlank()) {
			production.setName(dto.getName());
		}
		if (dto.getWeight() != null) {
			production.setWeight(dto.getWeight());
		}
		if (dto.getQuantity() != null) {
			production.setQuantity(dto.getQuantity());
		}
		if (dto.getMaterial() != null) {
			production.setMaterial(dto.getMaterial());
		}
		if (dto.getColor() != null) {
			production.setColor(dto.getColor());
		}
		if (dto.getSize() != null) {
			production.setSize(dto.getSize());
		}
		if (dto.getPrintTimeHours() != null) {
			production.setPrintTimeHours(dto.getPrintTimeHours());
		}
		if (dto.getSalePrice() != null) {
			production.setSalePrice(dto.getSalePrice());
		}
		if (dto.getFilamentPrice() != null) {
			production.setFilamentPrice(dto.getFilamentPrice());
		}
		// shippingCost is nullable — explicit null means "remove freight"
		production.setShippingCost(dto.getShippingCost());
		if (dto.getSalesChannel() != null) {
			production.setSalesChannel(dto.getSalesChannel());
		}
		if (dto.getFeePercentage() != null) {
			production.setFeePercentage(dto.getFeePercentage());
		}
		if (dto.getPrinterId() != null) {
			Printer printer = printerRepository.findByIdAndUser(dto.getPrinterId(), user)
					.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
			production.setPrinter(printer);
		}

		return toResponseDTO(productionRepository.save(production));
	}

	@Transactional
	public void deleteProduction(Long id) {
		User user = currentUserService.getCurrentUser();
		Production production = productionRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Production not found", HttpStatus.NOT_FOUND));
		productionRepository.delete(production);
	}

	@Transactional
	public void archiveProduction(Long id) {
		User user = currentUserService.getCurrentUser();
		Production production = productionRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Production not found", HttpStatus.NOT_FOUND));
		production.setStatus(ProductionStatus.ARCHIVED);
		productionRepository.save(production);
	}

	@Transactional
	public void restoreProduction(Long id) {
		User user = currentUserService.getCurrentUser();
		Production production = productionRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Production not found", HttpStatus.NOT_FOUND));
		production.setStatus(ProductionStatus.ACTIVE);
		productionRepository.save(production);
	}

	@Transactional(readOnly = true)
	public ProductionPageResponseDTO listArchivedForCurrentUserCursor(
			LocalDateTime cursorCreatedAt,
			Long cursorId,
			int limit) {
		User user = currentUserService.getCurrentUser();
		Long userId = user.getId();

		if ((cursorCreatedAt == null) != (cursorId == null)) {
			throw new ApiException("cursorCreatedAt and cursorId must both be provided or both omitted",
					HttpStatus.BAD_REQUEST);
		}

		int pageSize = Math.min(Math.max(limit, 1), 100);
		Pageable pageable = PageRequest.of(0, pageSize + 1);

		List<Production> rows = cursorCreatedAt == null
				? productionRepository.findFirstArchivedPageForUser(userId, pageable)
				: productionRepository.findArchivedPageForUserAfterCursor(userId, cursorCreatedAt, cursorId, pageable);

		boolean hasNext = rows.size() > pageSize;
		List<Production> page = hasNext ? rows.subList(0, pageSize) : rows;

		List<ProductionResponseDTO> items = page.stream()
				.map(this::toResponseDTO)
				.toList();

		ProductionCursorDTO nextCursor = null;
		if (hasNext && !items.isEmpty()) {
			ProductionResponseDTO last = items.get(items.size() - 1);
			nextCursor = new ProductionCursorDTO(last.getCreatedAt(), last.getId());
		}

		return ProductionPageResponseDTO.builder()
				.items(items)
				.nextCursor(nextCursor)
				.hasNext(hasNext)
				.build();
	}

	private ProductionResponseDTO toResponseDTO(Production p) {
		ProductionResponseDTO dto = new ProductionResponseDTO();
		dto.setId(p.getId());
		dto.setName(p.getName());
		dto.setMaterial(p.getMaterial());
		dto.setColor(p.getColor());
		dto.setSize(p.getSize());
		dto.setWeight(p.getWeight());
		dto.setQuantity(p.getQuantity());
		dto.setPrintTimeHours(p.getPrintTimeHours());
		dto.setSalePrice(p.getSalePrice());
		if (p.getSalePrice() != null && p.getQuantity() != null) {
			dto.setTotalRevenue(
					p.getSalePrice().multiply(BigDecimal.valueOf(p.getQuantity())).setScale(4, RoundingMode.HALF_UP));
		}
		dto.setEnergyCost(p.getEnergyCost());
		dto.setMaterialCost(p.getMaterialCost());
		dto.setTotalCost(p.getTotalCost());
		dto.setProfit(p.getProfit());
		dto.setMargin(p.getMargin());
		dto.setShippingCost(p.getShippingCost());
		dto.setCreatedAt(p.getCreatedAt());
		dto.setPrinterId(p.getPrinter() != null ? p.getPrinter().getId() : null);
		dto.setPrinterName(p.getPrinter() != null ? p.getPrinter().getName() : null);
		dto.setStatus(p.getStatus() != null ? p.getStatus().name() : ProductionStatus.ACTIVE.name());
		dto.setSalesChannel(p.getSalesChannel() != null ? p.getSalesChannel() : "DIRECT");
		dto.setFeePercentage(p.getFeePercentage() != null ? p.getFeePercentage() : java.math.BigDecimal.ZERO);
		return dto;
	}
}
