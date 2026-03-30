package com.valoreon.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.valoreon.dto.company.CompanyCreateDTO;
import com.valoreon.dto.company.UpdateCompanyDTO;
import com.valoreon.model.Company;
import com.valoreon.service.CompanyService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/company")
public class CompanyController {

	private final CompanyService companyService;

	public CompanyController(CompanyService companyService) {
		this.companyService = companyService;
	}

	@GetMapping
	public ResponseEntity<List<Company>> list() {
		return ResponseEntity.ok(companyService.listForCurrentUser());
	}

	@PostMapping
	public ResponseEntity<Company> create(@Valid @RequestBody CompanyCreateDTO dto) {
		return ResponseEntity.status(HttpStatus.CREATED).body(companyService.createCompany(dto));
	}

	@PutMapping("/{id}")
	public ResponseEntity<Company> update(@PathVariable Long id, @Valid @RequestBody UpdateCompanyDTO dto) {
		return ResponseEntity.ok(companyService.updateCompany(id, dto));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		companyService.deleteCompany(id);
		return ResponseEntity.noContent().build();
	}
}
