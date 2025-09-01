import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(identifier?: string) {
    super(
      `User ${identifier ? `with identifier '${identifier}'` : ''} not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class CourseNotFoundException extends HttpException {
  constructor(courseId?: string) {
    super(
      `Course ${courseId ? `with ID '${courseId}'` : ''} not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UnauthorizedAccessException extends HttpException {
  constructor(resource?: string) {
    super(
      `Unauthorized access${resource ? ` to ${resource}` : ''}`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super('Invalid email or password', HttpStatus.UNAUTHORIZED);
  }
}

export class EmailAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(`User with email '${email}' already exists`, HttpStatus.CONFLICT);
  }
}

export class UsernameAlreadyExistsException extends HttpException {
  constructor(username: string) {
    super(`User with username '${username}' already exists`, HttpStatus.CONFLICT);
  }
}

export class FileUploadException extends HttpException {
  constructor(message: string) {
    super(`File upload failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentProcessingException extends HttpException {
  constructor(message?: string) {
    super(
      `Payment processing failed${message ? `: ${message}` : ''}`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class CourseEnrollmentException extends HttpException {
  constructor(message: string) {
    super(`Course enrollment failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}

export class InvalidTokenException extends HttpException {
  constructor() {
    super('Invalid or expired token', HttpStatus.UNAUTHORIZED);
  }
}
