import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { mkdirSync } from "fs";
import { normalize, sep } from "path";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import {
    PROFILE_UPLOAD_DIR,
    PROFILE_UPLOADS_URL_PREFIX,
} from "./common/upload/file-upload.options";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);
    const logger = new Logger("Bootstrap");

    app.setGlobalPrefix("api");
    configureUploadedFileServing(app, logger);
    app.enableCors({
        origin: true,
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    const swaggerConfig = new DocumentBuilder()
        .setTitle("Student Digital Competency Profile API")
        .setDescription(
            "Backend foundation for student competency profiles and roadmaps",
        )
        .setVersion("0.1.0")
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);

    const port = configService.get<number>("PORT", 4000);
    await app.listen(port);
}

function configureUploadedFileServing(
    app: NestExpressApplication,
    logger: Logger,
) {
    mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });

    app.use(PROFILE_UPLOADS_URL_PREFIX, (request, response, next) => {
        let decodedPath: string;

        try {
            decodedPath = decodeURIComponent(request.path ?? "");
        } catch {
            response.status(400).json({
                success: false,
                statusCode: 400,
                message: "Invalid upload path",
                path: request.originalUrl,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const relativePath = decodedPath.replace(/^[/\\]+/, "");
        const normalizedPath = normalize(relativePath);
        const hasTraversal =
            decodedPath.includes("\0") ||
            normalizedPath === ".." ||
            normalizedPath.startsWith(`..${sep}`) ||
            normalizedPath.split(/[\\/]/).includes("..");

        if (hasTraversal) {
            response.status(400).json({
                success: false,
                statusCode: 400,
                message: "Invalid upload path",
                path: request.originalUrl,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        next();
    });

    app.useStaticAssets(PROFILE_UPLOAD_DIR, {
        prefix: `${PROFILE_UPLOADS_URL_PREFIX}/`,
        index: false,
        dotfiles: "deny",
        fallthrough: false,
        maxAge: "1d",
    });
    logger.log(`Serving uploaded profile files from ${PROFILE_UPLOAD_DIR}`);
}

void bootstrap();
