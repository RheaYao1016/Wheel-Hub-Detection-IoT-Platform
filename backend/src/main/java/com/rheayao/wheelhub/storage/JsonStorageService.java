package com.rheayao.wheelhub.storage;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JsonStorageService {

    private final ObjectMapper objectMapper;
    private final Path dataDirectory;

    public JsonStorageService(ObjectMapper objectMapper, @Value("${app.data-dir:./data}") String dataDirectory) {
        this.objectMapper = objectMapper;
        this.dataDirectory = Paths.get(dataDirectory).toAbsolutePath().normalize();
    }

    public synchronized <T> List<T> readList(String filename, Class<T> itemType, Supplier<List<T>> defaultSupplier) {
        Path filePath = resolve(filename);
        if (Files.notExists(filePath)) {
            List<T> defaults = List.copyOf(defaultSupplier.get());
            writeList(filename, defaults);
            return defaults;
        }

        try {
            JavaType listType = objectMapper.getTypeFactory().constructCollectionType(List.class, itemType);
            List<T> loaded = objectMapper.readValue(filePath.toFile(), listType);
            return List.copyOf(loaded);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read storage file: " + filePath, exception);
        }
    }

    public synchronized <T> void writeList(String filename, List<T> items) {
        Path filePath = resolve(filename);
        try {
            Files.createDirectories(filePath.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), items);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to write storage file: " + filePath, exception);
        }
    }

    public Path getDataDirectory() {
        return dataDirectory;
    }

    private Path resolve(String filename) {
        return dataDirectory.resolve(filename).normalize();
    }
}
