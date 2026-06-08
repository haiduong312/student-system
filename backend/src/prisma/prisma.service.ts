import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DEFAULT_DATABASE_URL =
    "postgresql://nguyenhaiduong@localhost:5432/student_system?schema=public";

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(PrismaService.name);

    constructor(configService: ConfigService) {
        super({
            adapter: new PrismaPg(
                configService.get<string>("DATABASE_URL") ??
                    DEFAULT_DATABASE_URL,
            ),
        });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
        this.logger.log("Connected to PostgreSQL through Prisma");
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
