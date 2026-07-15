package com.rheayao.wheelhub.enterprise;

import com.rheayao.wheelhub.enterprise.EnterpriseModels.AssistantProtocolCommand;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AssistantProtocolOption;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AssistantProtocolSpec;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class AssistantProtocolSupport {

    public static final String VERSION = "AIP1";
    public static final String DELIMITER = "&&";

    private AssistantProtocolSupport() {
    }

    public static AssistantProtocolCommand parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        List<String> segments = List.of(raw.split(DELIMITER, -1)).stream()
            .map(String::trim)
            .toList();
        if (segments.isEmpty()) {
            return null;
        }

        String displayText = segments.get(0);
        String version = segments.size() > 1 ? segments.get(1) : VERSION;
        String intentCategory = "HELP_GENERAL";
        String responseKind = "ANSWER";
        List<String> indexes = List.of();
        List<String> targetTypes = List.of();
        String route = "NONE";
        String authorizationMode = "NONE";
        String highlightMode = "NONE";
        List<AssistantProtocolOption> options = List.of();
        Map<String, String> payload = Map.of();

        for (int index = 2; index < segments.size(); index++) {
            String segment = segments.get(index);
            if (segment.startsWith("INTENT=")) {
                intentCategory = readValue(segment);
            } else if (segment.startsWith("RESPONSE=")) {
                responseKind = readValue(segment);
            } else if (segment.startsWith("@@")) {
                indexes = splitList(segment.substring(2));
            } else if (segment.startsWith("TYPE=")) {
                targetTypes = splitList(readValue(segment));
            } else if (segment.startsWith("ROUTE=")) {
                route = readValue(segment);
            } else if (segment.startsWith("AUTH=")) {
                authorizationMode = readValue(segment);
            } else if (segment.startsWith("HIGHLIGHT=")) {
                highlightMode = readValue(segment);
            } else if (segment.startsWith("OPTIONS=")) {
                options = parseOptions(readValue(segment));
            } else if (segment.startsWith("PAYLOAD=")) {
                payload = parsePayload(readValue(segment));
            }
        }

        return new AssistantProtocolCommand(
            raw,
            displayText,
            version,
            intentCategory,
            responseKind,
            indexes,
            targetTypes,
            route,
            authorizationMode,
            highlightMode,
            options,
            payload
        );
    }

    public static String buildChatProtocolGuide() {
        return """
Protocol version: AIP1
Return a single-line responseProtocol string using && as the only segment delimiter.
Segment order is fixed:
1) display text for the user, without && characters
2) AIP1
3) INTENT=<DATA_QUERY|DATA_AUTHORIZATION|MODE_SWITCH|STATE_SWITCH|CONFIG_UPDATE|CONFIG_READ|TRAINING_CONTROL|EXPORT_REQUEST|NAVIGATION|HELP_GENERAL>
4) RESPONSE=<ANSWER|REQUEST_AUTH|REQUEST_CHOICE|EXECUTE|NAVIGATE|UPDATE_SETTING|REFRESH_INDEX>
5) @@<indexId1>|<indexId2>|... and every operational answer must include at least one index
6) TYPE=<metric|dataset|report|toggle|button|page|setting|export|training_job|provider|analysis_job|index_catalog|unknown>
7) ROUTE=</page-path|NONE>
8) AUTH=<NONE|CONFIRM|REQUIRED>
9) HIGHLIGHT=<NONE|BLINK|PULSE>
10) OPTIONS=<optionId>~<label>~<description>|... or OPTIONS=NONE
11) PAYLOAD=<key>:<value>|<key>:<value>... or PAYLOAD=NONE
Rules:
- Use the exact segment order above.
- Keep display text natural and concise.
- Do not omit the @@ index segment. Use @@index.lookup.required if no final index can be determined.
- Use indexes from the provided index catalog whenever possible.
- For data access, ask for authorization first instead of pretending the data was already sent.
- For navigation or control, include the page route and the exact index for the target control or data object.
""";
    }

    public static AssistantProtocolSpec buildSpec() {
        return new AssistantProtocolSpec(
            VERSION,
            DELIMITER,
            "@@",
            "Structured AI agent protocol for intent classification, authorization, routing, and index-bound operations.",
            buildChatProtocolGuide(),
            List.of(
                "DATA_QUERY",
                "DATA_AUTHORIZATION",
                "MODE_SWITCH",
                "STATE_SWITCH",
                "CONFIG_UPDATE",
                "CONFIG_READ",
                "TRAINING_CONTROL",
                "EXPORT_REQUEST",
                "NAVIGATION",
                "HELP_GENERAL"
            ),
            List.of(
                "ANSWER",
                "REQUEST_AUTH",
                "REQUEST_CHOICE",
                "EXECUTE",
                "NAVIGATE",
                "UPDATE_SETTING",
                "REFRESH_INDEX"
            ),
            List.of(
                "metric",
                "dataset",
                "report",
                "toggle",
                "button",
                "page",
                "setting",
                "export",
                "training_job",
                "provider",
                "analysis_job",
                "index_catalog",
                "unknown"
            ),
            "Please authorize the requested source data first&&AIP1&&INTENT=DATA_QUERY&&RESPONSE=REQUEST_AUTH&&@@data.source.source-dashboard-seed|metric.analysis.latest-risk&&TYPE=dataset|metric&&ROUTE=/data-hub&&AUTH=REQUIRED&&HIGHLIGHT=BLINK&&OPTIONS=grant_data~Grant data access~Send the selected indexed data to AI|deny_data~Deny access~Keep the current view unchanged&&PAYLOAD=lookback_days:180|scope:preview"
        );
    }

    private static String readValue(String segment) {
        int splitIndex = segment.indexOf('=');
        if (splitIndex < 0 || splitIndex + 1 >= segment.length()) {
            return "";
        }
        return decode(segment.substring(splitIndex + 1));
    }

    private static List<String> splitList(String raw) {
        if (raw == null || raw.isBlank() || "NONE".equalsIgnoreCase(raw)) {
            return List.of();
        }
        return List.of(raw.split("\\|")).stream()
            .map(AssistantProtocolSupport::decode)
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .distinct()
            .toList();
    }

    private static List<AssistantProtocolOption> parseOptions(String raw) {
        if (raw == null || raw.isBlank() || "NONE".equalsIgnoreCase(raw)) {
            return List.of();
        }

        List<AssistantProtocolOption> options = new ArrayList<>();
        for (String entry : raw.split("\\|")) {
            String[] parts = entry.split("~", -1);
            String id = parts.length > 0 ? decode(parts[0]).trim() : "";
            if (id.isBlank()) {
                continue;
            }
            String label = parts.length > 1 ? decode(parts[1]).trim() : id;
            String description = parts.length > 2 ? decode(parts[2]).trim() : "";
            options.add(new AssistantProtocolOption(id, label, description));
        }
        return options.stream().limit(6).collect(Collectors.toList());
    }

    private static Map<String, String> parsePayload(String raw) {
        if (raw == null || raw.isBlank() || "NONE".equalsIgnoreCase(raw)) {
            return Map.of();
        }

        Map<String, String> payload = new LinkedHashMap<>();
        for (String entry : raw.split("\\|")) {
            int splitIndex = entry.indexOf(':');
            if (splitIndex <= 0) {
                continue;
            }
            String key = decode(entry.substring(0, splitIndex)).trim();
            String value = decode(entry.substring(splitIndex + 1)).trim();
            if (!key.isBlank()) {
                payload.put(key, value);
            }
        }
        return payload;
    }

    private static String decode(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return value;
        }
    }
}
