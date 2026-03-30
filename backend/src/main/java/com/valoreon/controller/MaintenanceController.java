package com.valoreon.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.valoreon.dto.maintenance.MaintenanceCreateDTO;
import com.valoreon.dto.maintenance.MaintenanceResponseDTO;
import com.valoreon.model.User;
import com.valoreon.service.CurrentUserService;
import com.valoreon.service.MaintenanceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping({ "/maintenance", "/maintenances" })
public class MaintenanceController {

	private final MaintenanceService maintenanceService;
	private final CurrentUserService currentUserService;

	public MaintenanceController(
			MaintenanceService maintenanceService,
			CurrentUserService currentUserService) {
		this.maintenanceService = maintenanceService;
		this.currentUserService = currentUserService;
	}

	@PostMapping
	public ResponseEntity<MaintenanceResponseDTO> create(@Valid @RequestBody MaintenanceCreateDTO dto) {
		return ResponseEntity.status(HttpStatus.CREATED).body(maintenanceService.create(dto));
	}

	@GetMapping("/open")
	public ResponseEntity<List<MaintenanceResponseDTO>> listOpen(
			@RequestParam(required = false) Long printerId) {
		User user = currentUserService.getCurrentUser();
		return ResponseEntity.ok(maintenanceService.getOpenMaintenances(user, printerId));
	}

	@GetMapping("/history")
	public ResponseEntity<List<MaintenanceResponseDTO>> listHistory(
			@RequestParam(required = false) Long printerId) {
		User user = currentUserService.getCurrentUser();
		return ResponseEntity.ok(maintenanceService.getMaintenanceHistory(user, printerId));
	}

	@GetMapping("/{id:\\d+}")
	public ResponseEntity<MaintenanceResponseDTO> getById(@PathVariable Long id) {
		return ResponseEntity.ok(maintenanceService.getByIdForCurrentUser(id));
	}

	@GetMapping
	public ResponseEntity<List<MaintenanceResponseDTO>> list(@RequestParam(required = false) Long printerId) {
		return ResponseEntity.ok(maintenanceService.list(printerId));
	}

	@PutMapping("/{id}/finish")
	public ResponseEntity<MaintenanceResponseDTO> finish(@PathVariable Long id) {
		return ResponseEntity.ok(maintenanceService.finishMaintenance(id));
	}

	@PostMapping("/{id}/finalize")
	public ResponseEntity<Void> finalizeMaintenance(@PathVariable Long id) {
		maintenanceService.finalizeMaintenance(id);
		return ResponseEntity.ok().build();
	}
}
