package com.rheayao.wheelhub.config;

import io.sentry.Sentry;
import io.sentry.SentryEvent;
import io.sentry.SentryLevel;
import io.sentry.protocol.User;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Sentry 错误追踪和性能监控配置类
 * 
 * 功能：
 * - 自动捕获Spring Boot异常
 * - 性能监控（事务追踪）
 * - 用户上下文追踪
 * - 日志集成（通过Logback）
 */
@Configuration
public class SentryConfig {

    private static final Logger log = LoggerFactory.getLogger(SentryConfig.class);

    @Value("${sentry.dsn:}")
    private String sentryDsn;

    @Value("${sentry.environment:development}")
    private String sentryEnvironment;

    @Value("${sentry.traces-sample-rate:0.1}")
    private double tracesSampleRate;

    @Value("${sentry.profiles-sample-rate:0.1}")
    private double profilesSampleRate;

    /**
     * 配置Sentry初始化
     * 通过application.properties配置，Spring Boot Starter会自动处理
     * 此方法用于额外的自定义配置
     */
    @Bean
    public SentryCustomizer sentryCustomizer() {
        return () -> {
            if (sentryDsn == null || sentryDsn.isEmpty()) {
                log.warn("Sentry DSN is not configured. Error tracking will be disabled.");
                return;
            }

            log.info("Sentry initialized - Environment: {}, Traces Sample Rate: {}",
                    sentryEnvironment, tracesSampleRate);

            // 设置全局标签
            Sentry.setTag("service", "wheel-hub-backend");
            Sentry.setTag("framework", "spring-boot");
            Sentry.setTag("version", "0.0.1-SNAPSHOT");
        };
    }

    /**
     * 工具类：手动上报异常到Sentry
     */
    public static void captureException(Exception ex, String context) {
        SentryEvent event = new SentryEvent(ex);
        event.setLevel(SentryLevel.ERROR);
        event.setTransaction(context);
        Sentry.captureEvent(event);
    }

    /**
     * 工具类：设置Sentry用户上下文
     */
    public static void setUser(String userId, String email, String username) {
        User user = new User();
        user.setId(userId);
        user.setEmail(email);
        user.setUsername(username);
        Sentry.setUser(user);
    }

    /**
     * 工具类：添加面包屑（操作追踪）
     */
    public static void addBreadcrumb(String message, String category) {
        Sentry.addBreadcrumb(message, category);
    }

    /**
     * 工具类：清除Sentry用户上下文
     */
    public static void clearUser() {
        Sentry.setUser(null);
    }

    /**
     * 自定义Sentry初始化钩子
     */
    @FunctionalInterface
    public interface SentryCustomizer {
        void customize();
    }
}
