import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { DatabaseModule } from 'src/database/database.module';

@Injectable()
export class CourseService {
  constructor(private readonly database: DatabaseModule) {}
  create(createCourseDto: CreateCourseDto) {
    return 'This action adds a new course';
  }

  findAll() {
    return `This action returns all course`;
  }

  findOne(id: number) {
    return `This action returns a #${id} course`;
  }

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return `This action updates a #${id} course`;
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
