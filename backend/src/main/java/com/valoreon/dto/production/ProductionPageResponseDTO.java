package com.valoreon.dto.production;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProductionPageResponseDTO {

	/** Same {@link ProductionResponseDTO} shape as create/update responses. */
	private List<ProductionResponseDTO> items;
	private ProductionCursorDTO nextCursor;
	private boolean hasNext;
}
