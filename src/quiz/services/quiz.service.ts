import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerService } from '../../common/services/logger.service';
import { Quiz } from '../entities/quiz.entity';
import { Question } from '../entities/question.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../course/entities/lesson.entity';

/**
 * Quiz Service for Uvarsity Backend
 * 
 * This service handles all quiz-related business logic:
 * - Quiz creation and management
 * - Question management within quizzes
 * - Quiz attempt tracking and scoring
 * - Results and analytics
 * - Integration with progress tracking
 */
@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new quiz
   */
  async createQuiz(lessonId: string, quizData: any, createdBy: string): Promise<Quiz> {
    this.logger.log(`Creating quiz for lesson: ${lessonId}`, 'QuizService');

    // Verify lesson exists
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Create quiz
    const quiz = this.quizRepository.create({
      ...quizData,
      lessonId,
      createdBy,
    });

    const savedQuiz = await this.quizRepository.save(quiz) as unknown as Quiz;
    this.logger.log(`Quiz created successfully: ${savedQuiz.id}`, 'QuizService');

    return savedQuiz;
  }

  /**
   * Get quiz by ID
   */
  async getQuizById(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['lesson', 'creator'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  /**
   * Get quizzes for a lesson
   */
  async getQuizzesForLesson(lessonId: string): Promise<Quiz[]> {
    return this.quizRepository.find({
      where: { lessonId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update quiz
   */
  async updateQuiz(id: string, updateData: any, userId: string): Promise<Quiz> {
    const quiz = await this.getQuizById(id);

    // Check if user has permission to update
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    Object.assign(quiz, updateData);
    const updatedQuiz = await this.quizRepository.save(quiz);

    this.logger.log(`Quiz updated: ${id}`, 'QuizService');
    return updatedQuiz;
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(id: string, userId: string): Promise<void> {
    const quiz = await this.getQuizById(id);

    // Check if user has permission to delete
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own quizzes');
    }

    await this.quizRepository.remove(quiz);
    this.logger.log(`Quiz deleted: ${id}`, 'QuizService');
  }

  /**
   * Publish quiz
   */
  async publishQuiz(id: string, userId: string): Promise<Quiz> {
    const quiz = await this.getQuizById(id);

    // Check if user has permission
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException('You can only publish your own quizzes');
    }

    quiz.status = 'published';
    quiz.publishedAt = new Date();

    const publishedQuiz = await this.quizRepository.save(quiz);
    this.logger.log(`Quiz published: ${id}`, 'QuizService');

    return publishedQuiz;
  }

  /**
   * Add question to quiz
   */
  async addQuestion(quizId: string, questionData: any, userId: string): Promise<Question> {
    const quiz = await this.getQuizById(quizId);

    // Check if user has permission
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException('You can only add questions to your own quizzes');
    }

    // Get next order number
    const questionCount = await this.questionRepository.count({
      where: { quizId },
    });

    const question = this.questionRepository.create({
      ...questionData,
      quizId,
      order: questionCount + 1,
    });

    const savedQuestion = await this.questionRepository.save(question) as unknown as Question;
    this.logger.log(`Question added to quiz: ${quizId}`, 'QuizService');

    return savedQuestion;
  }

  /**
   * Get questions for a quiz
   */
  async getQuizQuestions(quizId: string): Promise<Question[]> {
    return this.questionRepository.find({
      where: { quizId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Update question
   */
  async updateQuestion(questionId: string, updateData: any, userId: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check if user has permission
    if (question.quiz.createdBy !== userId) {
      throw new ForbiddenException('You can only update questions in your own quizzes');
    }

    Object.assign(question, updateData);
    const updatedQuestion = await this.questionRepository.save(question);

    this.logger.log(`Question updated: ${questionId}`, 'QuizService');
    return updatedQuestion;
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId: string, userId: string): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check if user has permission
    if (question.quiz.createdBy !== userId) {
      throw new ForbiddenException('You can only delete questions from your own quizzes');
    }

    await this.questionRepository.remove(question);
    this.logger.log(`Question deleted: ${questionId}`, 'QuizService');
  }

  /**
   * Start a quiz attempt
   */
  async startQuizAttempt(quizId: string, userId: string): Promise<QuizAttempt> {
    const quiz = await this.getQuizById(quizId);

    // Check if quiz is available
    if (!quiz.isAvailable()) {
      throw new BadRequestException('Quiz is not available for taking');
    }

    // Check attempt limits
    if (quiz.config.maxAttempts) {
      const attemptCount = await this.attemptRepository.count({
        where: { quizId, userId },
      });

      if (attemptCount >= quiz.config.maxAttempts) {
        throw new BadRequestException('Maximum attempts reached');
      }
    }

    // Get next attempt number
    const attemptNumber = await this.attemptRepository.count({
      where: { quizId, userId },
    }) + 1;

    // Create new attempt
    const attempt = this.attemptRepository.create({
      quizId,
      userId,
      attemptNumber,
      startedAt: new Date(),
      answers: {},
    });

    const savedAttempt = await this.attemptRepository.save(attempt);
    this.logger.log(`Quiz attempt started: ${savedAttempt.id}`, 'QuizService');

    return savedAttempt;
  }

  /**
   * Submit answer for a question
   */
  async submitAnswer(attemptId: string, questionId: string, answer: any, userId: string): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.status !== 'started') {
      throw new BadRequestException('Quiz attempt is not active');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, quizId: attempt.quizId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Update answer
    attempt.answers[questionId] = {
      answer,
      timeSpent: 0, // This would be calculated based on frontend timing
      submittedAt: new Date(),
      isCorrect: question.isAnswerCorrect(answer),
      pointsAwarded: question.isAnswerCorrect(answer) ? question.points : 0,
    };

    const updatedAttempt = await this.attemptRepository.save(attempt);
    this.logger.log(`Answer submitted for question: ${questionId}`, 'QuizService');

    return updatedAttempt;
  }

  /**
   * Complete quiz attempt
   */
  async completeQuizAttempt(attemptId: string, userId: string): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['quiz'],
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.status !== 'started') {
      throw new BadRequestException('Quiz attempt is not active');
    }

    // Calculate total possible score
    const questions = await this.getQuizQuestions(attempt.quizId);
    attempt.maxScore = questions.reduce((total, question) => total + question.points, 0);

    // Complete the attempt
    attempt.complete();
    attempt.checkPassed(attempt.quiz.config.passingScore);

    const completedAttempt = await this.attemptRepository.save(attempt);

    // Update quiz statistics
    await this.updateQuizStatistics(attempt.quizId);

    this.logger.log(`Quiz attempt completed: ${attemptId}`, 'QuizService');
    return completedAttempt;
  }

  /**
   * Get quiz attempt by ID
   */
  async getQuizAttempt(attemptId: string, userId: string): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['quiz', 'user'],
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    return attempt;
  }

  /**
   * Get user's attempts for a quiz
   */
  async getUserQuizAttempts(quizId: string, userId: string): Promise<QuizAttempt[]> {
    return this.attemptRepository.find({
      where: { quizId, userId },
      order: { attemptNumber: 'DESC' },
    });
  }

  /**
   * Update quiz statistics
   */
  private async updateQuizStatistics(quizId: string): Promise<void> {
    const attempts = await this.attemptRepository.find({
      where: { quizId, status: 'completed' },
    });

    if (attempts.length === 0) return;

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(attempt => attempt.isPassed).length;
    const averageScore = attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / totalAttempts;

    await this.quizRepository.update(quizId, {
      totalAttempts,
      passedAttempts,
      averageScore,
    });
  }
}