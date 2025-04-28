package com.lastcallsw.trackeats.entities;

public enum Status {
    PENDING(1),
    CONFIRMED(2),
    CANCELLED(3),
    BANNED(4);

    private final int value;

    private Status(int value) {
        this.value = value;
    }
    public int getValue() {
        return value;
    }
}
