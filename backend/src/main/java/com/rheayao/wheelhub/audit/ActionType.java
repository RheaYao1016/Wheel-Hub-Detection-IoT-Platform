package com.rheayao.wheelhub.audit;

/**
 * Audit action type enumeration.
 */
public enum ActionType {
    /** User login */
    LOGIN,
    /** User logout */
    LOGOUT,
    /** Data query / read operations */
    QUERY,
    /** Data creation */
    CREATE,
    /** Data modification */
    UPDATE,
    /** Data deletion */
    DELETE,
    /** Configuration changes */
    CONFIG_CHANGE,
    /** Data export */
    EXPORT,
    /** Data import */
    IMPORT,
    /** System-level operations */
    SYSTEM
}
