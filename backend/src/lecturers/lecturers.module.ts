import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { LecturersController } from './lecturers.controller';
import { LecturersService } from './lecturers.service';

@Module({
  imports: [UsersModule],
  controllers: [LecturersController],
  providers: [LecturersService],
  exports: [LecturersService],
})
export class LecturersModule {}
