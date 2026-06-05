package com.rheayao.wheelhub.audit;

import com.rheayao.wheelhub.auth.AuthInterceptor;
import com.rheayao.wheelhub.auth.AuthSession;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * AOP aspect that automatically captures REST API operations annotated with @AuditAction
 * and records them as audit log entries.
 */
@Aspect
@Component
public class AuditLogAspect {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogAspect.class);

    private final AuditLogService auditLogService;

    public AuditLogAspect(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @Around("@annotation(auditAction)")
    public Object aroundAuditAction(ProceedingJoinPoint joinPoint, AuditAction auditAction) throws Throwable {
        long startTime = System.currentTimeMillis();
        String operator = "system";
        String operatorRole = "unknown";
        String result = "success";
        String requestParams = "";

        try {
            // Resolve current user from request attribute (set by AuthInterceptor)
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                AuthSession session = resolveSession(request);
                if (session != null) {
                    operator = session.username();
                    operatorRole = session.role();
                }

                // Capture request params if configured
                if (auditAction.logParams()) {
                    requestParams = buildRequestParams(request);
                }
            }

            Object proceedResult = joinPoint.proceed();
            result = "success";
            return proceedResult;
        } catch (Throwable ex) {
            result = "error: " + ex.getMessage();
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            String module = auditAction.module();
            if (module.isEmpty()) {
                // Default: derive module from controller class name
                String className = signature.getDeclaringType().getSimpleName();
                module = className.replace("Controller", "");
            }

            String description = auditAction.description();
            if (description.isEmpty()) {
                description = auditAction.value() + " " + signature.getName();
            }

            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            String requestUri = "";
            String httpMethod = "";
            String clientIp = "";
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                requestUri = request.getRequestURI();
                httpMethod = request.getMethod();
                clientIp = getClientIp(request);
            }

            try {
                auditLogService.log(
                    operator,
                    operatorRole,
                    auditAction.value(),
                    module,
                    description,
                    requestUri,
                    httpMethod,
                    clientIp,
                    requestParams,
                    result,
                    duration
                );
            } catch (Exception e) {
                logger.warn("Failed to write audit log: {}", e.getMessage());
            }
        }
    }

    private AuthSession resolveSession(HttpServletRequest request) {
        try {
            Object sessionObj = request.getAttribute(AuthInterceptor.AUTH_SESSION_ATTRIBUTE);
            if (sessionObj instanceof AuthSession session) {
                return session;
            }
        } catch (Exception e) {
            logger.debug("Could not resolve session from request: {}", e.getMessage());
        }
        return null;
    }

    private String buildRequestParams(HttpServletRequest request) {
        StringBuilder sb = new StringBuilder();
        request.getParameterMap().forEach((key, values) -> {
            if (sb.length() > 0) {
                sb.append("&");
            }
            sb.append(key).append("=");
            if (values != null && values.length > 0) {
                sb.append(values[0]);
            }
        });
        return sb.length() > 500 ? sb.substring(0, 500) + "..." : sb.toString();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Handle comma-separated proxy chain
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
