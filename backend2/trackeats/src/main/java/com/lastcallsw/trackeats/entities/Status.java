package com.lastcallsw.trackeats.entities;

public enum Status {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    CANCELLED("cancelled"),
    BANNED("banned");

    private final String value;

    private Status(String value) {
        this.value = value;
    }
    public String getValue() {
        return value;
    }
}
