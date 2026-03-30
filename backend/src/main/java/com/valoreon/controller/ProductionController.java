package com.valoreon.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.valoreon.dto.production.ProductionCreateDTO;
import com.valoreon.dto.production.ProductionPageResponseDTO;
import com.valoreon.dto.production.ProductionResponseDTO;
import com.valoreon.dto.production.UpdateProductionDTO;
import com.valoreon.service.ProductionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/productions")
public class ProductionController {

	private final ProductionService productionService;

	public ProductionController(ProductionService productionService) {
		this.productionService = productionService;
	}

	@GetMapping
	public ResponseEntity<ProductionPageResponseDTO> list(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime cursorCreatedAt,
			@RequestParam(required = false) Long cursorId,
			@RequestParam(required = false) Long printerId,
			@RequestParam(defaultValue = "10") int limit,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
		return ResponseEntity.ok(productionService.listForCurrentUserCursor(
				cursorCreatedAt, cursorId, printerId, limit, startDate, endDate));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ProductionResponseDTO> findById(@PathVariable Long id) {
		return ResponseEntity.ok(productionService.findById(id));
	}

	@GetMapping("/by-printer/{id}")
	public ResponseEntity<List<ProductionResponseDTO>> findByPrinter(@PathVariable("id") Long printerId) {
		return ResponseEntity.ok(productionService.findByPrinterForCurrentUser(printerId));
	}

	@PostMapping
	public ResponseEntity<ProductionResponseDTO> create(@Valid @RequestBody ProductionCreateDTO dto) {
		return ResponseEntity.status(HttpStatus.CREATED).body(productionService.createProduction(dto));
	}

	/**
	 * Partial update; only {@link UpdateProductionDTO} fields are applied.
	 * Returns 404 if the production does not exist for the authenticated user.
	 */
	@PutMapping("/{id}")
	public ResponseEntity<ProductionResponseDTO> update(@PathVariable Long id,
			@Valid @RequestBody UpdateProductionDTO dto) {
		return ResponseEntity.ok(productionService.updateProduction(id, dto));
	}

	/**
	 * Deletes the production only when it belongs to the authenticated user (404 otherwise).
	 */
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		productionService.deleteProduction(id);
		return ResponseEntity.noContent().build();
	}

	/** Moves a production to the history (soft delete). */
	@PutMapping("/{id}/archive")
	public ResponseEntity<Void> archive(@PathVariable Long id) {
		productionService.archiveProduction(id);
		return ResponseEntity.noContent().build();
	}

	/** Restores an archived production back to active. */
	@PutMapping("/{id}/restore")
	public ResponseEntity<Void> restore(@PathVariable Long id) {
		productionService.restoreProduction(id);
		return ResponseEntity.noContent().build();
	}

	/** Lists archived productions with cursor pagination. */
	@GetMapping("/archived")
	public ResponseEntity<ProductionPageResponseDTO> listArchived(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime cursorCreatedAt,
			@RequestParam(required = false) Long cursorId,
			@RequestParam(defaultValue = "10") int limit) {
		return ResponseEntity.ok(productionService.listArchivedForCurrentUserCursor(cursorCreatedAt, cursorId, limit));
	}
}
