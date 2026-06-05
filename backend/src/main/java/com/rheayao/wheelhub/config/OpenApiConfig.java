package com.rheayao.wheelhub.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI / Swagger 配置类
 * 
 * 提供 API 文档自动生成、在线测试界面和 Bearer Token 认证支持。
 * 
 * 访问地址:
 * - Swagger UI: http://localhost:18081/swagger-ui.html
 * - OpenAPI JSON: http://localhost:18081/v3/api-docs
 * 
 * Security: Can be disabled in production by setting SWAGGER_ENABLED=false
 */
@Configuration
@ConditionalOnProperty(name = "springdoc.swagger-ui.enabled", havingValue = "true", matchIfMissing = true)
public class OpenApiConfig {

    @Value("${server.port:18081}")
    private int serverPort;

    @Bean
    public OpenAPI wheelHubOpenAPI() {
        final String securitySchemeName = "Bearer Authentication";

        return new OpenAPI()
                .info(new Info()
                        .title("Industrial Surface Defect Intelligent Detection System API")
                        .description("""
                                工业表面缺陷智能检测系统后端 API 文档。
                                
                                本平台提供完整的工业表面缺陷检测数据管理、告警管理、数据导入导出、
                                AI 分析、模型训练、标注管理以及实时监控功能。
                                
                                ## 认证说明
                                大多数接口需要通过 Bearer Token 进行认证。
                                请先调用 `/api/auth/login` 接口获取 Token，
                                然后点击页面右上角的 **Authorize** 按钮，输入 Token 进行认证。
                                
                                Token 格式: `Bearer <your-token>`
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Industrial Detection Platform Team")
                                .email("support@wheelhub.example.com"))
                        .license(new License()
                                .name("Proprietary")
                                .url("")))
                .servers(List.of(
                        new Server().url("http://localhost:" + serverPort).description("本地开发环境"),
                        new Server().url("http://localhost:18081").description("本地默认端口")
                ))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("请输入 Bearer Token（无需 'Bearer ' 前缀，系统会自动添加）")));
    }
}
