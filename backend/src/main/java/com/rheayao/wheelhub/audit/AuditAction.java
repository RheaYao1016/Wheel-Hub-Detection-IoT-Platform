package com.rheayao.wheelhub.audit;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method to be audited.
 * The AOP aspect intercepts annotated methods and records the operation.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AuditAction {

    /**
     * The type of operation being performed.
     */
    ActionType value() default ActionType.QUERY;

    /**
     * A human-readable description of the operation.
     * Supports SpEL-like placeholders: {method}, {uri}
     */
    String description() default "";

    /**
     * The module / functional area the operation belongs to.
     */
    String module() default "";

    /**
     * Whether to include request parameters in the log.
     */
    boolean logParams() default false;
}
