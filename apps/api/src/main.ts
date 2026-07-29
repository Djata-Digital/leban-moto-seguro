import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';


import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  app.enableCors();

  app.useStaticAssets(
    join(process.cwd(), 'uploads'),
    {
      prefix: '/uploads/',
    },
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
  );

  const config = new DocumentBuilder()
    .setTitle('LEBAN Moto Seguro API')
    .setDescription(
      'API para cadastro, controle, fiscalização, rastreamento e proteção de motas.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document =
    SwaggerModule.createDocument(
      app,
      config,
    );

  SwaggerModule.setup(
    'docs',
    app,
    document,
    {
      swaggerOptions: {
        persistAuthorization: true,
      },
    },
  );

  const port =
    process.env.PORT ?? 3000;

  await app.listen(port);

  console.log(
    `API rodando em http://localhost:${port}/api/v1`,
  );

  console.log(
    `Swagger em http://localhost:${port}/docs`,
  );
}

void bootstrap();