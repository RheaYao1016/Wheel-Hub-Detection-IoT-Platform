package com.rheayao.wheelhub.common;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiEnvelope<?>> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiEnvelope<?>> handleUnauthorized(UnauthorizedException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiEnvelope<?>> handleForbidden(SecurityException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiEnvelope<?>> handleUnavailable(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiEnvelope<?>> handleGeneric(Exception exception) {
        logger.error("Unhandled server error", exception);
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = "Unexpected server error";
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiEnvelope.error("Unexpected server error", Map.of("detail", message)));
    }
}
