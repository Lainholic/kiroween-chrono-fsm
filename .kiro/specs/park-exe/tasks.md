# Implementation Plan: PARK.EXE

## Overview

PARK.EXE는 공유 엔진 `src/core/fsm-engine.js`를 수정 없이 재사용하는 네 번째 앱이다. 구현 언어는 설계 문서가 정한 JavaScript (ES modules)이다. 순서는 다음과 같다.

1. 순수 모듈(constants, rng, scene-math, sprites, bubbles, loop, boot, audio-plan, schemas, sim)을 먼저 만들고 property test로 바로 검증한다.
2. Verifier(`tests/verify_park.js`)와 엔진 기준 해시(`git show HEAD:src/core/fsm-engine.js`로 계산)를 일찍 완성해 엔진 무수정 원칙을 초기에 고정한다.
3. Kiro hooks와 `tests/run_all.js`를 추가한다.
4. 그 다음 audio, render, main, `park.html`을 만들고, 마지막에 `index.html` 링크, `package.json` scripts, `pages.yml`을 연결한다.

## 전역 제약 (모든 태스크에 적용)

- `src/core/fsm-engine.js`, `src/core/fsm-engine.ts`, `tests/verify_chrono.js`, `.kiro/hooks/verify-chrono.kiro.hook`은 절대 수정하지 않는다.
- 기존 파일 수정은 `index.html`(park.html 링크 추가), `package.json`(scripts, devDependencies), `.github/workflows/pages.yml`(park.html 복사, verify 단계)만 허용한다.
- `npm test`와 Verifier는 Node 내장 모듈(`node:` 접두)만 사용한다. fast-check는 `npm run test:prop`에서만 사용한다.
- 앱 코드에서 `Math.random()`을 직접 호출하지 않는다. 주입된 `rng`를 사용한다.
- 순수 모듈은 `document`, `window`, Canvas API를 참조하지 않는다.
- 각 property test는 파일 상단 주석에 `Feature: park-exe, Property {번호}: {제목}` 태그를 달고, 최소 100회(`numRuns >= 100`) 반복한다. Property 17만 반복당 10,000회 시도이므로 `numRuns >= 20`으로 낮추고 이유를 주석에 적는다.

## Tasks

- [x] 1. 프로젝트 기반과 화면 수식 모듈
  - [x] 1.1 fast-check devDependency 설치 (exact 고정)
    - `npm install -D -E fast-check`로 정확한 버전을 `package.json`의 `devDependencies`에 고정하고 lock 파일을 갱신한다
    - `dependencies`는 비워 둔다. scripts 변경은 태스크 12.2에서 한다
    - `tests/props/` 디렉터리를 만든다 (`node:test` 실행기 사용)
    - _Requirements: 11.2, 12.13_

  - [x] 1.2 `src/park/constants.js`, `src/park/rng.js`, `src/park/package.json` 작성
    - `constants.js`: 논리 해상도 320x200, `WALK_FRAME_SEC`, `ARRIVE_EPS`, `MAX_FRAME_SEC`, `BUBBLE_SEC`, `SPEED`, `CRT_ON_MS`, `SHAKE_MAX_PX`, `ROLL_PER_SEC`, `COPIER_SCAN_PERIOD_SEC`, `LED_PERIODS_MS`, `OBJECTS`, `ANCHORS`
    - `rng.js`: `createRng(seed)` (mulberry32), `withSeededMathRandom(seed, fn)` (`finally`에서 `Math.random` 복원)
    - `src/park/package.json`: `{"type":"module"}` (루트 package.json은 건드리지 않음)
    - _Requirements: 3.1, 3.2, 4.4, 5.1, 5.5, 10.5, 11.1, 11.7_

  - [x] 1.3 `src/park/scene-math.js` 구현
    - `computeScale`, `shakeOffset`, `rollOffset`, `crtOnProgress`, `copierScanY`, `ledOn`, `moveToward`
    - `moveToward`는 오버슈트 없이 목표에 정확히 도착하고 이동량이 시간에만 비례하도록 한다
    - _Requirements: 3.1, 3.2, 3.4, 3.7, 5.2, 5.5, 9.3, 10.6_

  - [ ]* 1.4 Write property test for 화면 효과 수식
    - **Property 8: 화면 효과 수식의 범위**
    - 파일: `tests/props/p08-screen-effects.test.js`
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 1.5 Write property test for 정수 배율
    - **Property 9: 정수 배율 최대화**
    - 파일: `tests/props/p09-compute-scale.test.js`
    - **Validates: Requirements 3.4, 3.7**

  - [ ]* 1.6 Write property test for 오브젝트 애니메이션
    - **Property 14: 오브젝트 애니메이션은 주기적이고 범위 안에 있다**
    - 파일: `tests/props/p14-object-animation.test.js`
    - **Validates: Requirements 5.2, 5.5**

  - [ ]* 1.7 Write property test for 이동
    - **Property 22: 이동은 오버슈트 없이 도착하고 주사율과 무관하다**
    - 파일: `tests/props/p22-move-toward.test.js`
    - **Validates: Requirements 10.6, 9.3**

- [x] 2. Sprite 데이터와 디코딩
  - [x] 2.1 `src/park/sprites.js` 구현
    - Boss, Junior_Developer, Copier_Runner, Coffee_Bot 각각 팔레트와 Walk_Frame A/B (16줄 x 16자, 16진 팔레트 인덱스 문자열)
    - Newbie는 `paperIndex`로 문서 픽셀 표시
    - `decodeSprite` (정의 밖 문자와 부족한 칸은 `-1`, 예외 없음), `visiblePixels`, `walkPose`
    - 이미지 파일 없이 코드 데이터로만 정의한다
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9_

  - [ ]* 2.2 Write property test for 원본 스프라이트 데이터
    - **Property 10: 원본 스프라이트 데이터 무결성**
    - 파일: `tests/props/p10-sprite-data.test.js`
    - **Validates: Requirements 4.2, 12.4, 12.5**

  - [ ]* 2.3 Write property test for 디코딩 견고성
    - **Property 11: 스프라이트 디코딩은 정의 밖 문자를 투명 처리하고 실패하지 않는다**
    - 파일: `tests/props/p11-decode-sprite.test.js`
    - **Validates: Requirements 4.9**

  - [ ]* 2.4 Write property test for 걷기 포즈
    - **Property 12: 걷기 포즈는 시간에서 결정된다**
    - 파일: `tests/props/p12-walk-pose.test.js`
    - **Validates: Requirements 4.4, 4.5, 4.7**

  - [ ]* 2.5 Write property test for 문서 픽셀
    - **Property 13: 문서 픽셀은 문서를 들고 있을 때만 보인다**
    - 파일: `tests/props/p13-visible-pixels.test.js`
    - **Validates: Requirements 4.8**

- [x] 3. 말풍선, 루프, Boot 모델, Seek_Sound 계획
  - [x] 3.1 `src/park/bubbles.js` 구현
    - `createBubbleStore` (`show`, `update`, `active`): Agent당 1개, 같은 Agent의 새 `show`는 즉시 교체, 2.0초 후 제거
    - `clampBubbleRect(x, y, w, h)`: 320x200 경계 안으로 보정
    - _Requirements: 9.8, 9.9, 9.10_

  - [ ]* 3.2 Write property test for 말풍선
    - **Property 23: 말풍선 수명, 교체, 화면 경계**
    - 파일: `tests/props/p23-bubbles.test.js`
    - **Validates: Requirements 9.8, 9.9, 9.10**

  - [x] 3.3 `src/park/loop.js` 구현
    - `createLoop({ raf, caf, onFrame })`: `start`, `stop`, `pause`, `resume`
    - `dt = min(rawMs, 100) / 1000`, `pause` 후 `resume` 첫 프레임 `dt = 0`, `stop` 시 rAF 예약 해제
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 3.4 Write property test for 루프
    - **Property 24: 루프는 dt를 제한하고 일시정지와 재개를 처리한다**
    - 파일: `tests/props/p24-loop.test.js`
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

  - [x] 3.5 `src/park/boot.js` 구현
    - `createBootModel`, `isParkCommand`; `typeChar`(최대 64자), `backspace`, `enter`, `pointer`, `update`
    - 부팅 타임라인: BIOS 메모리 체크 줄, DOS 버전 줄, Prompt를 2초 안에 순서대로 별도 줄로 표시
    - `Bad command or file name` 출력, 빈 입력은 새 Prompt만, 5초 무입력 시 `Type PARK to begin` 1회
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 3.6 Write property test for 입력 줄
    - **Property 1: 입력 줄은 참조 모델과 같고 64자를 넘지 않는다**
    - 파일: `tests/props/p01-input-line.test.js`
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 3.7 Write property test for Enter 분류
    - **Property 2: Enter 결과 분류**
    - 파일: `tests/props/p02-enter-classify.test.js`
    - **Validates: Requirements 1.4, 1.5, 1.6**

  - [ ]* 3.8 Write property test for 힌트
    - **Property 3: 힌트는 5초 무입력 후 1회만 표시된다**
    - 파일: `tests/props/p03-hint.test.js`
    - **Validates: Requirements 1.7**

  - [x] 3.9 `src/park/audio-plan.js` 구현
    - `planSeekSound(rng)`: duration 2.0~3.0초, 하강 모터 톤 1개, 시크 클릭 6회 이상(간격 20ms 이상), 마지막 클릭 이후 래치 1회
    - _Requirements: 2.2, 2.3, 12.12_

  - [ ]* 3.10 Write property test for Seek_Sound 계획
    - **Property 5: Seek_Sound 계획 불변식**
    - 파일: `tests/props/p05-seek-plan.test.js`
    - **Validates: Requirements 2.2, 2.3, 12.12**

- [x] 4. Agent 스키마와 시뮬레이션
  - [x] 4.1 `src/park/schemas.js` 구현
    - `createBossSchema`, `createNewbieSchema`, `createCopierSchema`, `createCoffeeSchema`, `createAppSchema`, `tickAgent`, 상태별 `walkTo`/`say` 설정
    - 설계의 상태 다이어그램을 그대로 따른다. 모든 `initialState`는 `IDLE` (App 스키마는 `BOOT`)
    - Newbie `REVIEW`는 SUBMITTING에서 0.70 APPROVED / 0.30 REJECTED 두 transition, 대기 시간 1~3초와 `pagesTarget` 2~4는 주입된 `rng` 사용
    - Copier PRINTING은 self transition 루프이며 두 guard는 서로 배타적, `onEnter`가 `pagesPrinted`를 리셋하지 않음
    - Coffee RECHARGING은 `ARRIVED` self transition으로 `atRack`을 세팅
    - 시간 대기는 `context.dwell`과 `TICK` guard로 표현하고 엔진 `timeout`은 App 스키마에만 사용
    - `src/core/fsm-engine.js`는 import만 하고 수정하지 않는다
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.11, 7.15, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

  - [ ]* 4.2 Write property test for 스키마 정합성
    - **Property 15: 스키마 정합성**
    - 파일: `tests/props/p15-schema-integrity.test.js`
    - **Validates: Requirements 6.4, 12.6, 12.7, 12.8**

  - [ ]* 4.3 Write property test for REVIEW 분포
    - **Property 17: REVIEW 분포와 재현성**
    - 파일: `tests/props/p17-review-distribution.test.js` (`withSeededMathRandom` 사용, `numRuns` 20 이상, 이유 주석)
    - **Validates: Requirements 7.4, 7.10, 12.9**

  - [ ]* 4.4 Write property test for REVIEW 무시
    - **Property 18: REVIEW는 SUBMITTING에서만 효과가 있다**
    - 파일: `tests/props/p18-review-only-submitting.test.js`
    - **Validates: Requirements 7.15, 7.1**

  - [ ]* 4.5 Write property test for 시간 임계값
    - **Property 19: 시간 임계값은 프레임 분할과 무관하게 지켜진다**
    - 파일: `tests/props/p19-dwell-thresholds.test.js`
    - **Validates: Requirements 7.2, 7.8, 8.8, 9.2, 9.4, 9.7**

  - [ ]* 4.6 Write property test for 인쇄 루프
    - **Property 21: 인쇄 루프는 정확히 pagesTarget번 수행된다**
    - 파일: `tests/props/p21-print-loop.test.js`
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.9, 12.10**

  - [ ]* 4.7 Write property test for 단계 엔진
    - **Property 4: 단계 엔진은 허용되지 않은 이벤트를 무시한다**
    - 파일: `tests/props/p04-app-phase.test.js` (`mock.timers` 사용)
    - **Validates: Requirements 1.9, 3.8**

  - [x] 4.8 `src/park/sim.js` 구현
    - `createSimulation({ rng })`: Agent별 `FsmEngine` 4개, 알림 큐(프레임당 최대 64회), `moveToward` 이동과 `ARRIVED` 이벤트, `tickAgent`, 협업 점검(Boss `dwell >= 1.0`에서 `REVIEW` 전달, `pendingCopyJobs`로 `COPY_REQUEST`), 반응 규칙표 구현
    - Coffee_Bot SERVING→RECHARGING 시 Boss에 `커피 좋아` 말풍선 2.0초
    - `update(dt)`는 `min(dt, 0.1)` 방어 적용, `destroy()`는 멱등이며 엔진별 `try/catch`로 정확히 1회씩 호출
    - 리스너는 알림을 큐에 쌓기만 하고 엔진 `send()` 재진입을 하지 않는다
    - _Requirements: 6.1, 6.3, 7.7, 7.12, 7.13, 7.14, 9.5, 9.6, 9.8, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 4.9 Write property test for 협업 불변식
    - **Property 20: 시뮬레이션 협업 불변식**
    - 파일: `tests/props/p20-sim-collaboration.test.js`
    - **Validates: Requirements 7.7, 7.12, 7.13, 7.14**

  - [ ]* 4.10 Write property test for destroy
    - **Property 25: destroy는 모든 엔진을 정확히 1회 정리한다**
    - 파일: `tests/props/p25-sim-destroy.test.js`
    - **Validates: Requirements 10.4, 10.7**

- [x] 5. Checkpoint - 순수 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.
  - `npm run test:prop`를 쓸 수 없으면(스크립트는 12.2에서 추가) `node --test tests/props/`로 실행한다. `npm test`(기존 verify_chrono) 결과가 변하지 않았는지 확인한다.

- [x] 6. Verifier와 엔진 무결성 검사
  - [x] 6.1 `tests/lib/report.js` 구현
    - 순수 모듈: `formatCheck(result)` (`PASS <name>` / `FAIL <name> | expected: <e> | actual: <a>`, 정확히 한 줄), `summarize(results)` (`{total, pass, fail, exitCode}`)
    - Node 내장 모듈만 사용 (CommonJS)
    - _Requirements: 12.1, 12.2, 12.3, 12.13_

  - [ ]* 6.2 Write property test for 리포터
    - **Property 26: 리포터 출력 형식과 종료 코드**
    - 파일: `tests/props/p26-report.test.js`
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.14, 6.6**

  - [x] 6.3 `tests/lib/engine-normalize.js` 구현
    - `normalizeLineEndings`, `engineHash` (LF 정규화 후 SHA-256), `normalizeRuntime` (주석 제거 토크나이저는 문자열/템플릿 리터럴 안의 `//`를 건드리지 않음, `stripTypeScriptTypes` 사용, 클래스 필드 선언과 JS의 `module.exports` 호환 블록 제거, 공백 제거)
    - `stripTypeScriptTypes`가 없는 Node이면 명확한 오류를 던져 호출 측이 FAIL로 처리하게 한다
    - Node 내장 모듈만 사용
    - _Requirements: 6.5, 12.11, 12.13_

  - [ ]* 6.4 Write property test for 정규화
    - **Property 16: 엔진 정규화 비교의 불변성과 민감성**
    - 파일: `tests/props/p16-engine-normalize.test.js`
    - **Validates: Requirements 6.5, 12.11**

  - [x] 6.5 `tests/verify_park.js` 작성 (완성된 모듈 대상 검사)
    - CommonJS, `node:` 내장 모듈만 import, 모듈은 `import(pathToFileURL(...))`로 로드, 모든 검사를 끝까지 실행하고 마지막에 `SUMMARY total=N pass=P fail=F` 줄 출력, 실패 시 종료 코드 1
    - 기준 해시 상수는 `git show HEAD:src/core/fsm-engine.js`의 출력을 LF 정규화 후 SHA-256으로 계산해 넣고, 작업 트리 파일 해시와 일치하는지 확인한다 (불일치면 중단하고 사용자에게 보고)
    - 검사: `[engine:hash]`, `[engine:twin]`, `[audit:sprite]`, `[schema:*]`(target 존재, `initialState`, 상태 집합), `[audit:probability]`, `[fsm:review]`(시드 고정 10,000회, 재실행 동일), `[fsm:copier]`(pagesTarget 1, 3, 5), `[audio:plan]`, `[static:pure]`(순수 모듈 대상 금지 문자열과 import 성공), `[static:deps]`(`Math.random` 직접 호출, 외부 URL, `fetch(`, 이미지 확장자 없음)
    - 파일 읽기/import 실패는 해당 검사만 FAIL 처리
    - `node tests/verify_park.js`를 실행해 전부 PASS인지 확인한다
    - _Requirements: 4.2, 6.2, 6.4, 6.5, 6.6, 7.1, 7.4, 7.10, 7.11, 8.1, 8.3, 8.4, 8.5, 8.6, 9.1, 11.2, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13, 12.14_

- [x] 7. Checkpoint - Verifier 통과 확인
  - Ensure all tests pass, ask the user if questions arise.
  - `node tests/verify_park.js` 종료 코드 0, `node tests/verify_chrono.js` 기존 결과 그대로, `git diff --stat -- src/core tests/verify_chrono.js`가 비어 있음을 확인한다.

- [x] 8. Kiro hooks와 통합 테스트 러너
  - [x] 8.1 Kiro hook 4개 작성
    - `.kiro/hooks/park-save-verify.kiro.hook` (`fileEdited`: `src/park/**`, `park.html`), `park-engine-guard.kiro.hook` (`fileEdited`: `src/core/fsm-engine.js`, `src/core/fsm-engine.ts`), `park-run-all-tests.kiro.hook` (`userTriggered`), `park-structure-audit.kiro.hook` (`userTriggered`)
    - 기존 `verify-chrono.kiro.hook`과 같은 JSON 형식(`name`, `version`, `description`, `when`, `then.type = askAgent`, `then.prompt`). 기존 hook 파일은 열어서 형식만 참고하고 수정하지 않는다
    - 프롬프트 내용은 설계의 Kiro Hooks 표를 따른다 (요약 보고, 무수정 원칙 경고, Chrono/PARK 구분 요약, 항목별 PASS/FAIL, 엔진 결함 확인 시에만 수정 제안)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_

  - [x] 8.2 `tests/run_all.js` 작성
    - `verify_chrono.js`와 `verify_park.js`를 자식 프로세스로 둘 다 실행하고 출력을 구분해 보여 준다
    - 하나라도 실패하면 종료 코드 1. 첫 번째가 실패해도 두 번째를 실행한다
    - Node 내장 모듈만 사용. `tests/verify_chrono.js`는 수정하지 않는다
    - _Requirements: 6.7, 11.5, 13.5_

- [x] 9. Audio 엔진
  - [x] 9.1 `src/park/audio.js` 구현
    - `createAudio({ AudioContextCtor, setTimeout, clearTimeout })`: `unlock`, `playSeek`, `sfx`, `setMuted`, `isUnlocked`
    - oscillator, noise buffer, filter, gain만 사용 (오디오 파일 없음). `AudioContextCtor`는 `unlock()` 안에서만 `new`
    - 모든 생성/재개/스케줄을 `try/catch`로 감싸고 `resume()` 거부도 삼킨다
    - 재생 종료 후 400ms에 노드 `disconnect()`, 음소거 시 100ms 이내 중지하고 새 노드를 만들지 않음
    - `window`, `document` 참조 없음
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 9.2 Write property test for 오디오 게이팅
    - **Property 6: 오디오 게이팅과 실패 내성**
    - 파일: `tests/props/p06-audio-gating.test.js` (가짜 AudioContext 사용)
    - **Validates: Requirements 2.4, 2.5, 2.7, 2.8**

  - [ ]* 9.3 Write property test for 노드 정리
    - **Property 7: 재생이 끝나면 모든 노드가 정리된다**
    - 파일: `tests/props/p07-audio-cleanup.test.js` (가짜 스케줄러 사용)
    - **Validates: Requirements 2.6**

  - [x] 9.4 Verifier에 오디오 검사 추가
    - `tests/verify_park.js`에 `[audit:audio-gesture]` 추가: 가짜 AudioContext로 `unlock()` 전 생성자 호출 0회, 생성자 예외와 `resume` 거부에도 예외 없음
    - `[static:pure]` 대상에 `audio.js` 포함
    - _Requirements: 2.4, 2.5, 11.7, 13.6_

- [x] 10. Renderer
  - [x] 10.1 `src/park/render.js` 구현
    - 논리 캔버스 320x200에 그리고 `imageSmoothingEnabled = false`로 `computeScale` 정수 배율 확대, 중앙 배치, 작은 뷰포트는 1배율 + 잘림
    - Boot 화면 렌더링, PARKING 중 shake/roll, CRT_ON 켜짐 효과, CRT 후처리(스캔라인, 비네트 재사용, 인광 글로우)
    - Sprite는 `decodeSprite` 결과를 1x1 `fillRect`로 그리고 좌측 이동 시 수평 반전, 정의 밖 문자는 건너뜀, Newbie 문서 픽셀은 `hasDoc` 기준
    - Office_Object 4종을 `OBJECTS` 고정 좌표에 도형과 픽셀로 그림: copier 스캔 바(PRINTING 중 밝은 색), server rack LED(주기별), water cooler 기포(FILLING 중에만)
    - Speech_Bubble은 `clampBubbleRect`로 보정해 그림
    - 애니메이션 시간은 `sim.time` 기반
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 9.8, 9.9, 10.1_

- [x] 11. 앱 연결과 진입점
  - [x] 11.1 `src/park/main.js` 구현
    - `FsmEngine(createAppSchema({ seekMs, crtOnMs }))`의 `onStateChange`로 BOOT/PARKING/CRT_ON/OFFICE 동작 연결 (`seekMs`는 `planSeekSound().duration`을 ms로 변환)
    - 입력: `keydown`, `pointerdown`을 BOOT에서는 Boot 모델로, OFFICE에서는 `EXIT`로 전달. PARKING/CRT_ON 입력은 `send() === false`로 무시
    - 오디오 unlock: `pointerdown`, `keydown`, `touchstart`를 capture로 듣고 `audio.unlock()` 호출, `M` 키로 음소거 토글
    - `visibilitychange`에서 `loop.pause()` / `loop.resume()`
    - OFFICE → BOOT 시 `sim.destroy()`, Office 루프 `stop()`, Boot 루프 시작. 오디오 실패와 음소거에도 동일한 타이밍으로 진행
    - 렌더링, 오디오, DOM 코드는 리스너 또는 앱 전용 모듈에만 둔다
    - _Requirements: 1.8, 1.9, 2.4, 2.5, 2.7, 3.6, 3.8, 6.1, 6.3, 10.2, 10.3, 10.4_

  - [x] 11.2 `park.html` 작성
    - 캔버스와 숨김 `<pre id="park-error">`, `<script type="module">` loader가 `./src/park/main.js`를 import
    - 실패 시 모듈 목록을 개별 `import()`로 시도해 실패한 경로를 `console.error`로 출력하고 `<pre>`에 텍스트 오류 표시
    - 외부 라이브러리, CDN, 이미지 에셋 없음. 같은 출처 외 요청 0건
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 12. 기존 파일 연결과 최종 검사
  - [x] 12.1 `index.html`에 `park.html` 링크 추가
    - 링크 요소 1개 이상만 추가한다. 기존 3개 앱의 상태, 전이, 렌더링, 오디오 로직은 건드리지 않는다
    - _Requirements: 6.8, 11.9, 11.10_

  - [x] 12.2 `package.json` scripts 추가
    - `"test": "node tests/run_all.js"`, `"test:park": "node tests/verify_park.js"`, `"test:prop": "node --test tests/props/"`, 기존 `start` 유지
    - `devDependencies`의 fast-check는 exact 버전 그대로 유지, `dependencies`는 비워 둔다
    - _Requirements: 11.5, 11.6, 12.13_

  - [x] 12.3 `.github/workflows/pages.yml` 수정
    - verify 잡에 `node tests/verify_park.js` 단계 추가 (`verify_chrono.js` 단계 뒤)
    - Stage 단계에 `cp park.html _site/` 추가. `src/park/**`는 기존 `src` 복사에 포함됨을 확인한다
    - _Requirements: 11.8_

  - [x] 12.4 Verifier에 파일 구성과 hooks 검사 추가
    - `tests/verify_park.js`에 `[static:files]` 추가: `park.html`과 `src/park/*` 존재, `package.json`의 `test`/`test:park` 스크립트, `index.html`의 `park.html` 링크, `pages.yml`의 `park.html` 복사
    - `[hooks]` 추가: 새 hook 4개가 유효 JSON이고 `name`, `when`, `then` 포함, `verify-chrono.kiro.hook` 존재
    - _Requirements: 11.1, 11.5, 11.6, 11.8, 11.10, 13.1, 13.8, 13.9_

- [x] 13. Final checkpoint - 전체 검증
  - Ensure all tests pass, ask the user if questions arise.
  - `npm test`(Chrono와 PARK 모두 통과), `npm run test:prop`, `git diff --stat -- src/core tests/verify_chrono.js .kiro/hooks/verify-chrono.kiro.hook`가 비어 있음을 확인한다.
  - 수동 점검 항목(사용자 몫): `npm start` 후 `/park.html`에서 CRT 효과, 사운드, 탭 숨김/복귀, 모듈 로드 실패 메시지를 확인한다.

- [x] 14. 실행 후 피드백 반영 (English 전환, Idle 확대, CRT 베젤)
  - [x] 14.1 100% English 텍스트와 4대 Agent 말풍선, Consolas 폰트 전환
    - schemas.js/sim.js/render.js/park.html의 한글과 'Malgun Gothic' 제거, 상태별 영문 말풍선(배열이면 rng로 선택) 추가, `[static:english]` 검사 추가, requirements/design 문구 동기화
    - _Requirements: 7.5, 7.6, 9.5, 9.8_
  - [x] 14.2 Idle 대기 시간 4~8초로 확대
    - Newbie/Coffee/Copier IDLE `idleFor` 4~8초(rng), verifier `[fsm:copier]` 호환 유지, `[fsm:idle]` 검사 추가, requirements/design 수치 동기화
    - _Requirements: 7.2, 8.2, 9.2_
  - [x] 14.3 CRT 모니터 베젤과 디바이스 픽셀 정수 배율
    - park.html에 4:3 베젤(둥근 모서리, 음영) 구성, main.js/render.js에서 devicePixelRatio 기준 정수 배율로 선명하게 렌더, `[static:bezel]` 검사 추가
    - _Requirements: 3.4, 3.5, 3.7_

- [x] 15. 상표명 제거와 의존성 표현 정정
  - [x] 15.1 상표명 제거와 'zero external runtime dependencies' 표현 정정
    - .kiro/specs/park-exe 문서와 소스 주석에서 상표명 제거(해당 Agent 명칭을 Junior_Developer 등 중립 이름으로 교체), 의존성 표현을 정직하게 수정, verify_park.js 21개 통과 유지
    - _Requirements: 6.8, 11.2, 12.13_

- [x] 16. 주니어 개발자 스프라이트 룩 변경
  - [x] 16.1 newbie 팔레트를 브라운 헤어와 주황 후드티로 변경
    - `src/park/sprites.js` newbie 팔레트: 1 아웃라인 #1f1a17, 3 머리색 #5c3d2e, 4 셔츠 #f97316. 관련 주석 동기화, verify_park.js 21개 통과 유지
    - _Requirements: 4.1, 4.2_

## Notes

- `*`가 붙은 sub-task는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다. 건너뛰어도 Verifier(6.5)가 핵심 불변식을 시드 고정으로 검사한다.
- 각 태스크는 요구사항 번호를 참조해 추적 가능하다.
- Property test는 보편 속성을, Verifier의 예시 검사는 구조와 특정 값을 검증한다. 둘은 서로 보완한다.
- Canvas 렌더링과 CRT 시각 효과, 브라우저 로드 동작은 PBT 대상이 아니며 수동 점검으로 확인한다.
- Checkpoint 태스크는 의존성 그래프에 포함하지 않는다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1", "3.3", "3.5", "3.9", "4.1", "6.1", "6.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6", "1.7", "2.2", "2.3", "2.4", "2.5", "3.2", "3.4", "3.6", "3.7", "3.8", "3.10", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "6.2", "6.4", "9.1"] },
    { "id": 3, "tasks": ["4.9", "4.10", "6.5", "9.2", "9.3", "10.1"] },
    { "id": 4, "tasks": ["8.1", "8.2", "9.4", "11.1"] },
    { "id": 5, "tasks": ["11.2", "12.1", "12.2", "12.3"] },
    { "id": 6, "tasks": ["12.4"] },
    { "id": 7, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 8, "tasks": ["15.1"] },
    { "id": 9, "tasks": ["16.1"] }
  ]
}
```
