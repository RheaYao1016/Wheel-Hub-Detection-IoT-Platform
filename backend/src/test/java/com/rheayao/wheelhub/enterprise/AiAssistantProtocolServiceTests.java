package com.rheayao.wheelhub.enterprise;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rheayao.wheelhub.enterprise.EnterpriseModels.AiProtocolEnvelope;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ProtocolChoice;
import java.util.List;
import org.junit.jupiter.api.Test;

class AiAssistantProtocolServiceTests {

    private final AiAssistantProtocolService service = new AiAssistantProtocolService();

    @Test
    void parsesSegmentedProtocolAndChoices() {
        List<?> indexes = service.buildIndexCatalog(
            service.defaultSettings(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );

        AiProtocolEnvelope protocol = service.parseProtocol(
            "@V=WH-AI/1&&@TXT=请选择训练操作&&@INTENT=TRAINING_CONTROL&&@TYPE=REQUEST_CHOICE&&@OP=CONTROL&&@IDX=idx.action.training.start,idx.action.training.stop&&@TARGET=/training&&@AUTH=required:training.control&&@CHOICES=START>开始训练>idx.action.training.start|STOP>停止训练>idx.action.training.stop&&@FOLLOW=WAIT_USER_CHOICE&&@CONF=0.98",
            (List) indexes,
            "",
            "/training",
            "TRAINING_CONTROL"
        );

        assertEquals("TRAINING_CONTROL", protocol.intent());
        assertEquals("REQUEST_CHOICE", protocol.type());
        assertEquals(2, protocol.indexIds().size());
        assertEquals("/training", protocol.target());
        assertEquals(2, protocol.choices().size());
        ProtocolChoice firstChoice = protocol.choices().get(0);
        assertEquals("START", firstChoice.code());
        assertEquals("idx.action.training.start", firstChoice.indexId());
    }

    @Test
    void exportsStaticIndexCatalogToCsv() {
        var indexes = service.buildIndexCatalog(
            service.defaultSettings(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );

        String csv = service.buildIndexCsv(indexes);

        assertTrue(csv.startsWith("index_id,category,type"));
        assertTrue(csv.contains("idx.page.ai-assistant.chat"));
        assertFalse(csv.isBlank());
    }
}
