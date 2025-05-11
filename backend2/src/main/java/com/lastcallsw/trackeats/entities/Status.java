package com.lastcallsw.trackeats.entities;

public enum Status {
    pending,
    confirmed,
    cancelled,
    banned;

    // JPA with EnumType.STRING will use the enum constant's name() method.
    // If the database stores 'pending', 'confirmed', etc.,
    // the enum constants must match these names.
}
