package com.valoreon.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.valoreon.dto.printer.PrinterCreateDTO;
import com.valoreon.dto.printer.PrinterFinancialSummaryDTO;
import com.valoreon.dto.printer.PrinterResponseDTO;
import com.valoreon.dto.printer.UpdatePrinterDTO;
import com.valoreon.service.PrinterService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/printers")
public class PrinterController {

	private final PrinterService printerService;

	public PrinterController(PrinterService printerService) {
		this.printerService = printerService;
	}

	@GetMapping
	public ResponseEntity<List<PrinterResponseDTO>> list() {
		return ResponseEntity.ok(printerService.listForCurrentUser());
	}

	@GetMapping("/{id}")
	public ResponseEntity<PrinterResponseDTO> findById(@PathVariable Long id) {
		return ResponseEntity.ok(printerService.findById(id));
	}

	@GetMapping("/{id}/summary")
	public ResponseEntity<PrinterFinancialSummaryDTO> getSummary(@PathVariable Long id) {
		return ResponseEntity.ok(printerService.getPrinterSummary(id));
	}

	@PostMapping
	public ResponseEntity<PrinterResponseDTO> create(@Valid @RequestBody PrinterCreateDTO dto) {
		return ResponseEntity.status(HttpStatus.CREATED).body(printerService.createPrinter(dto));
	}

	@PutMapping("/{id}")
	public ResponseEntity<PrinterResponseDTO> update(@PathVariable Long id,
			@Valid @RequestBody UpdatePrinterDTO dto) {
		return ResponseEntity.ok(printerService.updatePrinter(id, dto));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		printerService.deletePrinter(id);
		return ResponseEntity.noContent().build();
	}
}
