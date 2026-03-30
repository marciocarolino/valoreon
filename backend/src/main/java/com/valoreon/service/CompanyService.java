package com.valoreon.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.valoreon.dto.company.CompanyCreateDTO;
import com.valoreon.dto.company.UpdateCompanyDTO;
import com.valoreon.exception.ApiException;
import com.valoreon.model.Company;
import com.valoreon.model.User;
import com.valoreon.repository.CompanyRepository;

@Service
public class CompanyService {

	private final CompanyRepository companyRepository;
	private final CurrentUserService currentUserService;

	public CompanyService(CompanyRepository companyRepository, CurrentUserService currentUserService) {
		this.companyRepository = companyRepository;
		this.currentUserService = currentUserService;
	}

	@Transactional(readOnly = true)
	public List<Company> listForCurrentUser() {
		User user = currentUserService.getCurrentUser();
		return companyRepository.findAllByUser(user);
	}

	@Transactional
	public Company createCompany(CompanyCreateDTO dto) {
		User user = currentUserService.getCurrentUser();

		Company company = new Company();
		company.setName(dto.getName());
		company.setSector(dto.getSector());
		company.setMonthlyRevenue(dto.getMonthlyRevenue());
		company.setMonthlyProfit(dto.getMonthlyProfit());
		company.setGrowthRate(dto.getGrowthRate());
		company.setUser(user);

		return companyRepository.save(company);
	}

	@Transactional
	public Company updateCompany(Long id, UpdateCompanyDTO dto) {
		User user = currentUserService.getCurrentUser();
		Company company = companyRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Company not found", HttpStatus.NOT_FOUND));

		if (dto.getName() != null && !dto.getName().isBlank()) {
			company.setName(dto.getName());
		}
		if (dto.getSector() != null && !dto.getSector().isBlank()) {
			company.setSector(dto.getSector());
		}
		if (dto.getMonthlyRevenue() != null) {
			company.setMonthlyRevenue(dto.getMonthlyRevenue());
		}
		if (dto.getMonthlyProfit() != null) {
			company.setMonthlyProfit(dto.getMonthlyProfit());
		}
		if (dto.getGrowthRate() != null) {
			company.setGrowthRate(dto.getGrowthRate());
		}

		return companyRepository.save(company);
	}

	@Transactional
	public void deleteCompany(Long id) {
		User user = currentUserService.getCurrentUser();
		Company company = companyRepository.findByIdAndUser(id, user)
				.orElseThrow(() -> new ApiException("Company not found", HttpStatus.NOT_FOUND));
		companyRepository.delete(company);
	}
}
