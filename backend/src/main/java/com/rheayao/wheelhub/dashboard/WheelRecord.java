package com.rheayao.wheelhub.dashboard;

public record WheelRecord(
    String id,
    double diameter,
    double averageBolt,
    double center,
    double pcd,
    String type
) {
}
