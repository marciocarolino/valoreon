package com.valoreon.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.valoreon.model.Feedback;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

	List<Feedback> findAllByUserId(Long userId);
}
