import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { QuizService } from '../services/quiz.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Quiz Controller for Uvarsity Backend
 * 
 * This controller handles all quiz-related HTTP endpoints:
 * - Quiz creation and management
 * - Question management within quizzes
 * - Quiz attempt tracking and submission
 * - Results and analytics
 * - Integration with progress tracking
 */
@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // === QUIZ MANAGEMENT ENDPOINTS ===

  /**
   * Create a new quiz
   */
  @Post('lesson/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new quiz',
    description: 'Create a new quiz for a lesson',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async createQuiz(
    @Param('lessonId') lessonId: string,
    @Body() quizData: any,
    @Request() req,
  ) {
    const createdBy = req.user.id;
    const quiz = await this.quizService.createQuiz(lessonId, quizData, createdBy);
    return quiz.getDisplayInfo();
  }

  /**
   * Get quiz by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get quiz details',
    description: 'Get detailed information about a quiz',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async getQuiz(@Param('id') id: string) {
    const quiz = await this.quizService.getQuizById(id);
    return quiz.getDisplayInfo();
  }

  /**
   * Get quizzes for a lesson
   */
  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lesson quizzes',
    description: 'Get all quizzes for a specific lesson',
  })
  @ApiResponse({
    status: 200,
    description: 'Quizzes retrieved successfully',
  })
  async getLessonQuizzes(@Param('lessonId') lessonId: string) {
    const quizzes = await this.quizService.getQuizzesForLesson(lessonId);
    return quizzes.map(quiz => quiz.getDisplayInfo());
  }

  /**
   * Update quiz
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update quiz',
    description: 'Update quiz information (creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not quiz creator',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async updateQuiz(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    const userId = req.user.id;
    const quiz = await this.quizService.updateQuiz(id, updateData, userId);
    return quiz.getDisplayInfo();
  }

  /**
   * Delete quiz
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete quiz',
    description: 'Delete a quiz (creator only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Quiz deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not quiz creator',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async deleteQuiz(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    await this.quizService.deleteQuiz(id, userId);
  }

  /**
   * Publish quiz
   */
  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish quiz',
    description: 'Publish a quiz to make it available for students',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz published successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not quiz creator',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async publishQuiz(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const quiz = await this.quizService.publishQuiz(id, userId);
    return quiz.getDisplayInfo();
  }

  // === QUESTION MANAGEMENT ENDPOINTS ===

  /**
   * Add question to quiz
   */
  @Post(':id/questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add question to quiz',
    description: 'Add a new question to a quiz',
  })
  @ApiResponse({
    status: 201,
    description: 'Question added successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not quiz creator',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async addQuestion(
    @Param('id') quizId: string,
    @Body() questionData: any,
    @Request() req,
  ) {
    const userId = req.user.id;
    const question = await this.quizService.addQuestion(quizId, questionData, userId);
    return question.getDisplayInfo();
  }

  /**
   * Get quiz questions
   */
  @Get(':id/questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get quiz questions',
    description: 'Get all questions for a quiz',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async getQuizQuestions(@Param('id') quizId: string) {
    const questions = await this.quizService.getQuizQuestions(quizId);
    return questions.map(question => question.getDisplayInfo());
  }

  /**
   * Update question
   */
  @Put('questions/:questionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update question',
    description: 'Update a quiz question (creator only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not quiz creator',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    const userId = req.user.id;
    const question = await this.quizService.updateQuestion(questionId, updateData, userId);
    return question.getDisplayInfo();
  }

  /**
   * Delete question
   */
  @Delete('questions/:questionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete question',
    description: 'Delete a quiz question (creator only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Question deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not quiz creator',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  async deleteQuestion(@Param('questionId') questionId: string, @Request() req) {
    const userId = req.user.id;
    await this.quizService.deleteQuestion(questionId, userId);
  }

  // === QUIZ ATTEMPT ENDPOINTS ===

  /**
   * Start quiz attempt
   */
  @Post(':id/attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start quiz attempt',
    description: 'Start a new quiz attempt',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz attempt started successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Quiz not available or attempt limit reached',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async startQuizAttempt(@Param('id') quizId: string, @Request() req) {
    const userId = req.user.id;
    const attempt = await this.quizService.startQuizAttempt(quizId, userId);
    return attempt.getDisplayInfo();
  }

  /**
   * Submit answer
   */
  @Post('attempts/:attemptId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit answer',
    description: 'Submit an answer for a quiz question',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Quiz attempt not active',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz attempt or question not found',
  })
  async submitAnswer(
    @Param('attemptId') attemptId: string,
    @Body() answerData: { questionId: string; answer: any },
    @Request() req,
  ) {
    const userId = req.user.id;
    const attempt = await this.quizService.submitAnswer(
      attemptId,
      answerData.questionId,
      answerData.answer,
      userId,
    );
    return attempt.getDisplayInfo();
  }

  /**
   * Complete quiz attempt
   */
  @Put('attempts/:attemptId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete quiz attempt',
    description: 'Complete and grade a quiz attempt',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz attempt completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Quiz attempt not active',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz attempt not found',
  })
  async completeQuizAttempt(@Param('attemptId') attemptId: string, @Request() req) {
    const userId = req.user.id;
    const attempt = await this.quizService.completeQuizAttempt(attemptId, userId);
    return attempt.getDisplayInfo();
  }

  /**
   * Get quiz attempt
   */
  @Get('attempts/:attemptId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get quiz attempt',
    description: 'Get details of a quiz attempt',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz attempt retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz attempt not found',
  })
  async getQuizAttempt(@Param('attemptId') attemptId: string, @Request() req) {
    const userId = req.user.id;
    const attempt = await this.quizService.getQuizAttempt(attemptId, userId);
    return attempt.getDetailedResults();
  }

  /**
   * Get user's quiz attempts
   */
  @Get(':id/attempts/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user quiz attempts',
    description: 'Get current user\'s attempts for a quiz',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz attempts retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  async getUserQuizAttempts(@Param('id') quizId: string, @Request() req) {
    const userId = req.user.id;
    const attempts = await this.quizService.getUserQuizAttempts(quizId, userId);
    return attempts.map(attempt => attempt.getDisplayInfo());
  }
}