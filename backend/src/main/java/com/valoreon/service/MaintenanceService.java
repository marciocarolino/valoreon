package com.valoreon.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.maintenance.MaintenanceCreateDTO;
import com.valoreon.dto.maintenance.MaintenanceResponseDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.Maintenance;
import com.valoreon.model.Printer;
import com.valoreon.model.User;
import com.valoreon.model.enums.MaintenanceStatus;
import com.valoreon.model.enums.PrinterStatus;
import com.valoreon.repository.MaintenanceRepository;
import com.valoreon.repository.PrinterRepository;

@Service
public class MaintenanceService {

	private final MaintenanceRepository maintenanceRepository;
	private final PrinterRepository printerRepository;
	private final CurrentUserService currentUserService;

	public MaintenanceService(
			MaintenanceRepository maintenanceRepository,
			PrinterRepository printerRepository,
			CurrentUserService currentUserService) {
		this.maintenanceRepository = maintenanceRepository;
		this.printerRepository = printerRepository;
		this.currentUserService = currentUserService;
	}

	@Transactional
	public MaintenanceResponseDTO create(MaintenanceCreateDTO dto) {
		User user = currentUserService.getCurrentUser();
		Long userId = user.getId();

		Printer linkedPrinter = printerRepository.findByIdAndUser(dto.getPrinterId(), user)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));

		if (maintenanceRepository.existsInProgressMaintenance(dto.getPrinterId(), userId)) {
			throw new ApiException("Printer already in maintenance", HttpStatus.BAD_REQUEST);
		}

		LocalDateTime now = LocalDateTime.now();
		Maintenance m = new Maintenance();
		m.setPrinter(linkedPrinter);
		m.setUser(user);
		m.setType(dto.getType());
		m.setDescription(dto.getDescription());
		m.setCost(dto.getCost());
		m.setMaintenanceDate(dto.getDate());
		m.setNotes(dto.getNotes());
		m.setStartDate(now);
		m.setEndDate(null);
		m.setStatus(MaintenanceStatus.IN_PROGRESS);
		m.setFinishedAt(null);

		assertDateStatusConsistent(m);

		Maintenance saved = maintenanceRepository.save(m);
		maintenanceRepository.flush();

		Printer printer = printerRepository.findByIdAndUserId(saved.getPrinter().getId(), userId)
				.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));

		printerRepository.updateStatus(printer.getId(), user.getId(), PrinterStatus.MAINTENANCE);

		return toResponseDTO(saved);
	}

	@Transactional
	public MaintenanceResponseDTO finishMaintenance(Long id) {
		Long userId = currentUserService.getCurrentUser().getId();

		Maintenance maintenance = maintenanceRepository.findByIdAndUserIdWithPrinter(id, userId)
				.orElseThrow(() -> new ApiException("Maintenance not found", HttpStatus.NOT_FOUND));

		if (maintenance.getPrinter() == null) {
			throw new ApiException("Maintenance has no printer", HttpStatus.BAD_REQUEST);
		}

		if (maintenance.getStatus() == MaintenanceStatus.FINISHED) {
			throw new ApiException("Maintenance already finished", HttpStatus.CONFLICT);
		}

		if (maintenance.getStatus() != MaintenanceStatus.IN_PROGRESS) {
			throw new ApiException("Maintenance is not in progress", HttpStatus.BAD_REQUEST);
		}

		LocalDateTime now = LocalDateTime.now();
		maintenance.setEndDate(now);
		maintenance.setFinishedAt(now);
		maintenance.setStatus(MaintenanceStatus.FINISHED);

		assertDateStatusConsistent(maintenance);

		maintenanceRepository.save(maintenance);

		Long printerId = maintenance.getPrinter().getId();
		printerRepository.updateStatus(printerId, userId, PrinterStatus.ACTIVE);

		return toResponseDTO(maintenance);
	}

	@Transactional
	public void finalizeMaintenance(Long id) {
		finishMaintenance(id);
	}

	@Transactional(readOnly = true)
	public List<MaintenanceResponseDTO> getOpenMaintenances(User user, Long printerId) {
		if (printerId != null) {
			printerRepository.findByIdAndUser(printerId, user)
					.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
			return maintenanceRepository
					.findByUserIdAndPrinterIdAndStatus(user.getId(), printerId, MaintenanceStatus.IN_PROGRESS)
					.stream().map(this::toResponseDTO).toList();
		}
		return maintenanceRepository.findInProgressByUserId(user.getId()).stream()
				.map(this::toResponseDTO)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<MaintenanceResponseDTO> getMaintenanceHistory(User user, Long printerId) {
		if (printerId != null) {
			printerRepository.findByIdAndUser(printerId, user)
					.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
			return maintenanceRepository
					.findByUserIdAndPrinterIdAndStatus(user.getId(), printerId, MaintenanceStatus.FINISHED)
					.stream().map(this::toResponseDTO).toList();
		}
		return maintenanceRepository.findFinishedByUserId(user.getId()).stream()
				.map(this::toResponseDTO)
				.toList();
	}

	@Transactional(readOnly = true)
	public MaintenanceResponseDTO getByIdForCurrentUser(Long id) {
		Long userId = currentUserService.getCurrentUser().getId();
		Maintenance maintenance = maintenanceRepository.findByIdAndUserIdWithPrinter(id, userId)
				.orElseThrow(() -> new ApiException("Maintenance not found", HttpStatus.NOT_FOUND));
		return toResponseDTO(maintenance);
	}

	@Transactional(readOnly = true)
	public List<MaintenanceResponseDTO> list(Long printerId) {
		User user = currentUserService.getCurrentUser();
		Long userId = user.getId();

		if (printerId != null) {
			printerRepository.findByIdAndUser(printerId, user)
					.orElseThrow(() -> new ApiException("Printer not found", HttpStatus.NOT_FOUND));
		}

		List<Maintenance> rows = printerId == null
				? maintenanceRepository.findAllForUserId(userId)
				: maintenanceRepository.findAllForUserIdAndPrinterId(userId, printerId);

		return rows.stream().map(this::toResponseDTO).toList();
	}

	/**
	 * Invariant: if {@code endDate} is set, status must be {@link MaintenanceStatus#FINISHED}.
	 */
	private static void assertDateStatusConsistent(Maintenance m) {
		if (m.getEndDate() != null && m.getStatus() != MaintenanceStatus.FINISHED) {
			throw new ApiException(
					"Invalid maintenance state: end date is set but status is not FINISHED",
					HttpStatus.BAD_REQUEST);
		}
	}

	private MaintenanceResponseDTO toResponseDTO(Maintenance m) {
		MaintenanceResponseDTO dto = new MaintenanceResponseDTO();
		dto.setId(m.getId());
		Printer printer = m.getPrinter();
		if (printer != null) {
			dto.setPrinterId(printer.getId());
			String name = printer.getName();
			dto.setPrinterName(name != null ? name : "");
		}
		dto.setType(m.getType());
		dto.setStatus(m.getStatus());
		dto.setDescription(m.getDescription());
		dto.setCost(m.getCost());
		dto.setDate(m.getMaintenanceDate());

		LocalDateTime startDate = m.getStartDate();
		if (startDate == null && m.getMaintenanceDate() != null) {
			startDate = m.getMaintenanceDate().atStartOfDay();
		}
		dto.setStartDate(startDate);

		LocalDateTime endDate = m.getEndDate() != null ? m.getEndDate() : m.getFinishedAt();
		dto.setEndDate(endDate);
		dto.setFinishedAt(endDate != null ? endDate : m.getFinishedAt());

		dto.setCreatedAt(m.getCreatedAt());
		dto.setNotes(m.getNotes());

		LocalDateTime durationStart = m.getStartDate();
		if (durationStart == null && m.getMaintenanceDate() != null) {
			durationStart = m.getMaintenanceDate().atStartOfDay();
		}
		LocalDateTime durationEnd = m.getEndDate() != null ? m.getEndDate() : m.getFinishedAt();
		if (durationStart != null && durationEnd != null) {
			long seconds = Duration.between(durationStart, durationEnd).getSeconds();
			dto.setDurationInSeconds(seconds);
			dto.setDurationFormatted(formatDurationHhMmSs(seconds));
		} else {
			dto.setDurationInSeconds(null);
			dto.setDurationFormatted(null);
		}

		return dto;
	}

	private static String formatDurationHhMmSs(long totalSeconds) {
		if (totalSeconds < 0) {
			totalSeconds = 0;
		}
		long hours = totalSeconds / 3600;
		long minutes = (totalSeconds % 3600) / 60;
		long secs = totalSeconds % 60;
		return String.format("%02d:%02d:%02d", hours, minutes, secs);
	}
}
