package com.rheayao.wheelhub.common;

import com.rheayao.wheelhub.config.SentryConfig;
import io.sentry.Sentry;
import io.sentry.SentryLevel;
import io.sentry.SpanStatus;
import io.sentry.spring.jakarta.SentryExceptionResolver;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiEnvelope<?>> handleBadRequest(IllegalArgumentException exception) {
        logger.warn("Bad request: {}", exception.getMessage());

        // 上报到Sentry作为warning级别
        Sentry.captureException(exception, scope -> {
            scope.setLevel(SentryLevel.WARNING);
            scope.setTag("exception.type", "IllegalArgumentException");
            scope.setTransaction("handleBadRequest");
        });

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiEnvelope<?>> handleForbidden(SecurityException exception) {
        logger.warn("Security violation: {}", exception.getMessage());

        // 安全违规 - 标记为warning并设置安全标签
        Sentry.captureException(exception, scope -> {
            scope.setLevel(SentryLevel.WARNING);
            scope.setTag("exception.type", "SecurityException");
            scope.setTag("security.violation", "true");
            scope.setTransaction("handleForbidden");
        });

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiEnvelope<?>> handleUnavailable(IllegalStateException exception) {
        logger.error("Service unavailable: {}", exception.getMessage());

        // 服务不可用 - 上报到Sentry作为error
        Sentry.captureException(exception, scope -> {
            scope.setLevel(SentryLevel.ERROR);
            scope.setTag("exception.type", "IllegalStateException");
            scope.setTransaction("handleUnavailable");
        });

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ApiEnvelope.error(exception.getMessage(), Map.of()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiEnvelope<?>> handleNotFound(NoResourceFoundException exception) {
        // 404不主动上报Sentry（通常不需要追踪）
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiEnvelope.error("The requested resource was not found.", Map.of()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiEnvelope<?> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        String paramName = exception.getName();
        String expectedType = exception.getRequiredType() != null ? exception.getRequiredType().getSimpleName() : "unknown";
        logger.warn("Type mismatch for parameter '{}': expected {}", paramName, expectedType);

        // 参数类型不匹配 - 上报为info级别
        Sentry.captureException(exception, scope -> {
            scope.setLevel(SentryLevel.INFO);
            scope.setTag("exception.type", "MethodArgumentTypeMismatchException");
            scope.setTag("param.name", paramName);
            scope.setTransaction("handleTypeMismatch");
        });

        return ApiEnvelope.error("Invalid parameter '" + paramName + "': expected " + expectedType, Map.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiEnvelope<?>> handleGeneric(Exception exception) {
        logger.error("Unexpected server error: {}", exception.getMessage(), exception);

        // 未捕获异常 - 上报到Sentry作为fatal级别
        Sentry.captureException(exception, scope -> {
            scope.setLevel(SentryLevel.FATAL);
            scope.setTag("exception.type", "UnhandledException");
            scope.setTransaction("handleGeneric");
        });

        // 设置当前Sentry事务状态为失败
        try {
            Sentry.getSpan().setStatus(SpanStatus.INTERNAL_ERROR);
        } catch (Exception ignored) {
            // 忽略事务设置错误
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiEnvelope.error("An unexpected error occurred. Please try again later or contact support.", Map.of()));
    }
}
