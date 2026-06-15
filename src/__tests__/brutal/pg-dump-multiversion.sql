-- PostgreSQL database dump
-- Dumped from database version 12.18
-- Dumped by pg_dump version 12.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- === Simulated pg_dump from PG 12 ===

CREATE SCHEMA dump_v12;
CREATE TABLE dump_v12.sample (id INT PRIMARY KEY, data TEXT);
COMMENT ON TABLE dump_v12.sample IS 'From pg_dump 12.18';
ALTER TABLE dump_v12.sample OWNER TO postgres;

COPY dump_v12.sample (id, data) FROM stdin;
1	test
\.

-- PostgreSQL database dump
-- Dumped from database version 14.12
-- Dumped by pg_dump version 14.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- === Simulated pg_dump from PG 14 ===

CREATE SCHEMA dump_v14;
CREATE TABLE dump_v14.sample (id INT PRIMARY KEY, data TEXT);
COMMENT ON TABLE dump_v14.sample IS 'From pg_dump 14.12';
ALTER TABLE dump_v14.sample OWNER TO postgres;

COPY dump_v14.sample (id, data) FROM stdin;
1	test
\.

-- PostgreSQL database dump
-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- === Simulated pg_dump from PG 15 ===

CREATE SCHEMA dump_v15;
CREATE TABLE dump_v15.sample (id INT PRIMARY KEY, data TEXT);
COMMENT ON TABLE dump_v15.sample IS 'From pg_dump 15.8';
ALTER TABLE dump_v15.sample OWNER TO postgres;

CREATE UNIQUE INDEX idx_nd ON dump_v15.sample (data) NULLS NOT DISTINCT;

COPY dump_v15.sample (id, data) FROM stdin;
1	test
\.

-- PostgreSQL database dump
-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- === Simulated pg_dump from PG 17 ===

CREATE SCHEMA dump_v17;
CREATE TABLE dump_v17.sample (id INT PRIMARY KEY, data TEXT);
COMMENT ON TABLE dump_v17.sample IS 'From pg_dump 17.2';
ALTER TABLE dump_v17.sample OWNER TO postgres;

CREATE UNIQUE INDEX idx_nd ON dump_v17.sample (data) NULLS NOT DISTINCT;

COPY dump_v17.sample (id, data) FROM stdin;
1	test
\.

-- PostgreSQL database dump
-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- === Simulated pg_dump from PG 18 ===

CREATE SCHEMA dump_v18;
CREATE TABLE dump_v18.sample (id INT PRIMARY KEY, data TEXT);
COMMENT ON TABLE dump_v18.sample IS 'From pg_dump 18.0';
ALTER TABLE dump_v18.sample OWNER TO postgres;

CREATE TABLE dump_v18.temporal (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);

COPY dump_v18.sample (id, data) FROM stdin;
1	test
\.

-- PostgreSQL database dump
-- Dumped from database version 19.0
-- Dumped by pg_dump version 19.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- === Simulated pg_dump from PG 19 ===

CREATE SCHEMA dump_v19;
CREATE TABLE dump_v19.sample (id INT PRIMARY KEY, data TEXT);
COMMENT ON TABLE dump_v19.sample IS 'From pg_dump 19.0';
ALTER TABLE dump_v19.sample OWNER TO postgres;

CREATE TABLE dump_v19.temporal (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);

CREATE PROPERTY GRAPH dump_graph NODE TABLES (N LABEL n (id)) EDGE TABLES (E LABEL e SOURCE N DESTINATION N PROPERTIES (w));

COPY dump_v19.sample (id, data) FROM stdin;
1	test
\.

-- padding line 167
-- padding line 168
-- padding line 169
-- padding line 170
-- padding line 171
-- padding line 172
-- padding line 173
-- padding line 174
-- padding line 175
-- padding line 176
-- padding line 177
-- padding line 178
-- padding line 179
-- padding line 180
-- padding line 181
-- padding line 182
-- padding line 183
-- padding line 184
-- padding line 185
-- padding line 186
-- padding line 187
-- padding line 188
-- padding line 189
-- padding line 190
-- padding line 191
-- padding line 192
-- padding line 193
-- padding line 194
-- padding line 195
-- padding line 196
-- padding line 197
-- padding line 198
-- padding line 199
-- padding line 200
-- padding line 201
-- padding line 202
-- padding line 203
-- padding line 204
-- padding line 205
-- padding line 206
-- padding line 207
-- padding line 208
-- padding line 209
-- padding line 210
-- padding line 211
-- padding line 212
-- padding line 213
-- padding line 214
-- padding line 215
-- padding line 216
-- padding line 217
-- padding line 218
-- padding line 219
-- padding line 220
-- padding line 221
-- padding line 222
-- padding line 223
-- padding line 224
-- padding line 225
-- padding line 226
-- padding line 227
-- padding line 228
-- padding line 229
-- padding line 230
-- padding line 231
-- padding line 232
-- padding line 233
-- padding line 234
-- padding line 235
-- padding line 236
-- padding line 237
-- padding line 238
-- padding line 239
-- padding line 240
-- padding line 241
-- padding line 242
-- padding line 243
-- padding line 244
-- padding line 245
-- padding line 246
-- padding line 247
-- padding line 248
-- padding line 249
-- padding line 250
-- padding line 251
-- padding line 252
-- padding line 253
-- padding line 254
-- padding line 255
-- padding line 256
-- padding line 257
-- padding line 258
-- padding line 259
-- padding line 260
-- padding line 261
-- padding line 262
-- padding line 263
-- padding line 264
-- padding line 265
-- padding line 266
-- padding line 267
-- padding line 268
-- padding line 269
-- padding line 270
-- padding line 271
-- padding line 272
-- padding line 273
-- padding line 274
-- padding line 275
-- padding line 276
-- padding line 277
-- padding line 278
-- padding line 279
-- padding line 280
-- padding line 281
-- padding line 282
-- padding line 283
-- padding line 284
-- padding line 285
-- padding line 286
-- padding line 287
-- padding line 288
-- padding line 289
-- padding line 290
-- padding line 291
-- padding line 292
-- padding line 293
-- padding line 294
-- padding line 295
-- padding line 296
-- padding line 297
-- padding line 298
-- padding line 299
-- padding line 300
-- padding line 301
-- padding line 302
-- padding line 303
-- padding line 304
-- padding line 305
-- padding line 306
-- padding line 307
-- padding line 308
-- padding line 309
-- padding line 310
-- padding line 311
-- padding line 312
-- padding line 313
-- padding line 314
-- padding line 315
-- padding line 316
-- padding line 317
-- padding line 318
-- padding line 319
-- padding line 320
-- padding line 321
-- padding line 322
-- padding line 323
-- padding line 324
-- padding line 325
-- padding line 326
-- padding line 327
-- padding line 328
-- padding line 329
-- padding line 330
-- padding line 331
-- padding line 332
-- padding line 333
-- padding line 334
-- padding line 335
-- padding line 336
-- padding line 337
-- padding line 338
-- padding line 339
-- padding line 340
-- padding line 341
-- padding line 342
-- padding line 343
-- padding line 344
-- padding line 345
-- padding line 346
-- padding line 347
-- padding line 348
-- padding line 349
-- padding line 350
-- padding line 351
-- padding line 352
-- padding line 353
-- padding line 354
-- padding line 355
-- padding line 356
-- padding line 357
-- padding line 358
-- padding line 359
-- padding line 360
-- padding line 361
-- padding line 362
-- padding line 363
-- padding line 364
-- padding line 365
-- padding line 366
-- padding line 367
-- padding line 368
-- padding line 369
-- padding line 370
-- padding line 371
-- padding line 372
-- padding line 373
-- padding line 374
-- padding line 375
-- padding line 376
-- padding line 377
-- padding line 378
-- padding line 379
-- padding line 380
-- padding line 381
-- padding line 382
-- padding line 383
-- padding line 384
-- padding line 385
-- padding line 386
-- padding line 387
-- padding line 388
-- padding line 389
-- padding line 390
-- padding line 391
-- padding line 392
-- padding line 393
-- padding line 394
-- padding line 395
-- padding line 396
-- padding line 397
-- padding line 398
-- padding line 399
-- padding line 400
-- padding line 401
-- padding line 402
-- padding line 403
-- padding line 404
-- padding line 405
-- padding line 406
-- padding line 407
-- padding line 408
-- padding line 409
-- padding line 410
-- padding line 411
-- padding line 412
-- padding line 413
-- padding line 414
-- padding line 415
-- padding line 416
-- padding line 417
-- padding line 418
-- padding line 419
-- padding line 420
-- padding line 421
-- padding line 422
-- padding line 423
-- padding line 424
-- padding line 425
-- padding line 426
-- padding line 427
-- padding line 428
-- padding line 429
-- padding line 430
-- padding line 431
-- padding line 432
-- padding line 433
-- padding line 434
-- padding line 435
-- padding line 436
-- padding line 437
-- padding line 438
-- padding line 439
-- padding line 440
-- padding line 441
-- padding line 442
-- padding line 443
-- padding line 444
-- padding line 445
-- padding line 446
-- padding line 447
-- padding line 448
-- padding line 449
-- padding line 450
-- padding line 451
-- padding line 452
-- padding line 453
-- padding line 454
-- padding line 455
-- padding line 456
-- padding line 457
-- padding line 458
-- padding line 459
-- padding line 460
-- padding line 461
-- padding line 462
-- padding line 463
-- padding line 464
-- padding line 465
-- padding line 466
-- padding line 467
-- padding line 468
-- padding line 469
-- padding line 470
-- padding line 471
-- padding line 472
-- padding line 473
-- padding line 474
-- padding line 475
-- padding line 476
-- padding line 477
-- padding line 478
-- padding line 479
-- padding line 480
-- padding line 481
-- padding line 482
-- padding line 483
-- padding line 484
-- padding line 485
-- padding line 486
-- padding line 487
-- padding line 488
-- padding line 489
-- padding line 490
-- padding line 491
-- padding line 492
-- padding line 493
-- padding line 494
-- padding line 495
-- padding line 496
-- padding line 497
-- padding line 498
-- padding line 499
-- padding line 500
-- padding line 501
-- padding line 502
-- padding line 503
-- padding line 504
-- padding line 505
-- padding line 506
-- padding line 507
-- padding line 508
-- padding line 509
-- padding line 510
-- padding line 511
-- padding line 512
-- padding line 513
-- padding line 514
-- padding line 515
-- padding line 516
-- padding line 517
-- padding line 518
-- padding line 519
-- padding line 520
-- padding line 521
-- padding line 522
-- padding line 523
-- padding line 524
-- padding line 525
-- padding line 526
-- padding line 527
-- padding line 528
-- padding line 529
-- padding line 530
-- padding line 531
-- padding line 532
-- padding line 533
-- padding line 534
-- padding line 535
-- padding line 536
-- padding line 537
-- padding line 538
-- padding line 539
-- padding line 540
-- padding line 541
-- padding line 542
-- padding line 543
-- padding line 544
-- padding line 545
-- padding line 546
-- padding line 547
-- padding line 548
-- padding line 549
-- padding line 550
-- padding line 551
-- padding line 552
-- padding line 553
-- padding line 554
-- padding line 555
-- padding line 556
-- padding line 557
-- padding line 558
-- padding line 559
-- padding line 560
-- padding line 561
-- padding line 562
-- padding line 563
-- padding line 564
-- padding line 565
-- padding line 566
-- padding line 567
-- padding line 568
-- padding line 569
-- padding line 570
-- padding line 571
-- padding line 572
-- padding line 573
-- padding line 574
-- padding line 575
-- padding line 576
-- padding line 577
-- padding line 578
-- padding line 579
-- padding line 580
-- padding line 581
-- padding line 582
-- padding line 583
-- padding line 584
-- padding line 585
-- padding line 586
-- padding line 587
-- padding line 588
-- padding line 589
-- padding line 590
-- padding line 591
-- padding line 592
-- padding line 593
-- padding line 594
-- padding line 595
-- padding line 596
-- padding line 597
-- padding line 598
-- padding line 599
-- padding line 600
-- padding line 601
-- padding line 602
-- padding line 603
-- padding line 604
-- padding line 605
-- padding line 606
-- padding line 607
-- padding line 608
-- padding line 609
-- padding line 610
-- padding line 611
-- padding line 612
-- padding line 613
-- padding line 614
-- padding line 615
-- padding line 616
-- padding line 617
-- padding line 618
-- padding line 619
