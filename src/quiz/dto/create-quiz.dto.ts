import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject, MinLength, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({ example: 'JavaScript Fundamentals Quiz', description: 'Quiz title' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Test your knowledge of JavaScript basics', description: 'Quiz description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'Read each question carefully and select the best answer', description: 'Quiz instructions', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @ApiProperty({ 
    example: {
      timeLimit: 30,
      maxAttempts: 3,
      passingScore: 70,
      showCorrectAnswers: true,
      shuffleQuestions: false,
      shuffleAnswers: false
    },
    description: 'Quiz configuration',
    required: false
  })
  @IsOptional()
  @IsObject()
  config?: {
    timeLimit?: number;
    maxAttempts?: number;
    passingScore?: number;
    showCorrectAnswers?: boolean;
    shuffleQuestions?: boolean;
    shuffleAnswers?: boolean;
  };

  @ApiProperty({ example: '2024-12-01T00:00:00Z', description: 'Quiz available from date', required: false })
  @IsOptional()
  availableFrom?: Date;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Quiz available until date', required: false })
  @IsOptional()
  availableUntil?: Date;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'multiple_choice', description: 'Question type' })
  @IsString()
  type: 'multiple_choice' | 'true_false' | 'essay' | 'fill_blank';

  @ApiProperty({ example: 'What is the output of console.log(typeof null)?', description: 'Question text' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  questionText: string;

  @ApiProperty({ example: 'In JavaScript, null is considered an object due to a historical bug', description: 'Question explanation', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  explanation?: string;

  @ApiProperty({ example: 1, description: 'Points for correct answer' })
  @IsNumber()
  @Min(0)
  @Max(100)
  points: number;

  @ApiProperty({ 
    example: [
      { id: 'a', text: 'object', isCorrect: true },
      { id: 'b', text: 'null', isCorrect: false },
      { id: 'c', text: 'undefined', isCorrect: false }
    ],
    description: 'Answer options for multiple choice questions',
    required: false
  })
  @IsOptional()
  @IsArray()
  options?: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];

  @ApiProperty({ 
    example: { options: ['a'], boolean: true, text: 'Sample answer' },
    description: 'Correct answer configuration'
  })
  @IsObject()
  correctAnswer: {
    options?: string[];
    boolean?: boolean;
    text?: string;
    pattern?: string;
  };

  @ApiProperty({ 
    example: { difficulty: 'medium', tags: ['javascript', 'types'] },
    description: 'Question metadata',
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    category?: string;
    estimatedTime?: number;
  };
}

export class SubmitAnswerDto {
  @ApiProperty({ example: 'question-uuid', description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: ['a'], description: 'Answer value (format depends on question type)' })
  answer: any;
}