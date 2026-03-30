package com.valoreon.service;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.valoreon.dto.feedback.FeedbackRequestDTO;
import com.valoreon.model.Feedback;
import com.valoreon.repository.FeedbackRepository;
import com.valoreon.repository.UserRepository;

@Service
public class FeedbackService {

	private final FeedbackRepository feedbackRepository;
	private final UserRepository userRepository;

	public FeedbackService(FeedbackRepository feedbackRepository, UserRepository userRepository) {
		this.feedbackRepository = feedbackRepository;
		this.userRepository = userRepository;
	}

	public void createFeedback(FeedbackRequestDTO dto) {
		Feedback feedback = new Feedback();
		feedback.setType(dto.getType());
		feedback.setMessage(dto.getMessage().strip());

		if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
			feedback.setEmail(dto.getEmail().strip());
		}

		String principal = SecurityContextHolder.getContext().getAuthentication().getName();
		if (principal != null && !principal.isBlank() && !"anonymousUser".equals(principal)) {
			userRepository.findByEmail(principal)
					.ifPresent(user -> feedback.setUserId(user.getId()));
		}

		feedbackRepository.save(feedback);
	}
}
