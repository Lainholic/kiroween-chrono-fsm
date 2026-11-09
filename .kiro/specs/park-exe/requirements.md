# Requirements Document

## Introduction

PARK.EXE는 1980년대 MS-DOS의 하드디스크 헤드 파킹 유틸리티 PARK.EXE를 부활(Resurrection)시킨 웹 앱이다. 사용자가 DOS 프롬프트에서 `PARK` 명령을 실행하면 절차적으로 합성된 HDD 헤드 파킹 시크 사운드가 재생되고, 화면이 레트로 CRT 뷰로 전환되어 레트로 미니어처 픽셀 에이전트 스타일의 사무실 시뮬레이션 스크린세이버가 실행된다. 스크린세이버에는 16x16 픽셀아트 에이전트 4종(Boss, Junior Developer, Copier Runner, Coffee Bot)과 오브젝트 4종(boss desk, copier, water cooler, server rack)이 등장한다.

앱은 기존 Chrono-FSM의 공유 엔진 `src/core/fsm-engine.js`를 수정 없이 재사용한다. 앱은 별도 진입점 `park.html`과 전용 모듈, 전용 verifier(`tests/verify_park.js`)로 추가되며 기존 3개 앱(Neon Focus Clock, Jack-in-the-Box, Haunted Vending Machine)과 `npm test`를 깨뜨리지 않는다. 외부 런타임 의존성 0 (순수 바닐라 JS, Canvas 2D, Web Audio API)이며 이미지 에셋은 없다. 자동 검증 파이프라인은 `.kiro/hooks/`의 Kiro hooks로 정의한다.

## Glossary

- **Park_App**: `park.html`에서 실행되는 PARK.EXE 웹 애플리케이션 전체
- **FSM_Engine**: `src/core/fsm-engine.js`의 `FsmEngine` 클래스. 수정 없이 재사용하는 공유 엔진
- **Boot_Screen**: 1980s DOS 부팅 메시지와 명령 프롬프트를 표시하는 화면
- **Prompt**: Boot_Screen의 명령 입력 줄 (예: `C:\>`)
- **Park_Command**: Prompt에 입력되는 `PARK` 또는 `PARK.EXE` 명령 (대소문자 구분 없음)
- **Audio_Engine**: Web Audio API로 사운드를 절차적으로 합성하는 Park_App 모듈
- **Seek_Sound**: HDD 헤드 파킹 시크를 모사하는 합성 사운드 (모터 스핀다운, 헤드 클릭, 파킹 래치 포함)
- **Audio_Unlock**: 사용자 제스처(키 입력 또는 클릭) 이후에만 AudioContext를 생성/재개하는 절차
- **CRT_View**: 스캔라인, 곡면 비네트, 인광 글로우를 적용한 레트로 CRT 렌더 화면
- **Office_Scene**: CRT_View 안에서 실행되는 레트로 미니어처 픽셀 에이전트 스타일 사무실 시뮬레이션 스크린세이버
- **Renderer**: Canvas 2D로 Boot_Screen, Office_Scene, CRT_View를 그리는 모듈
- **Agent**: Office_Scene의 16x16 픽셀아트 캐릭터. Boss, Junior_Developer, Copier_Runner, Coffee_Bot 중 하나
- **Boss**: 문서를 승인 또는 반려하는 Agent
- **Junior_Developer**: 문서를 들고 Boss에게 걸어가는 Agent
- **Copier_Runner**: 복사기에서 인쇄 루프를 반복하는 Agent
- **Coffee_Bot**: water cooler 주변에서 커피를 나르는 Agent
- **Sprite**: 문자열 팔레트 인덱스 배열로 코드에 정의된 16x16 픽셀아트 이미지
- **Walk_Frame**: Agent의 2프레임 뒤뚱거림(waddling) 걷기 애니메이션 프레임 (frame A, frame B)
- **Office_Object**: boss desk, copier, water cooler, server rack 중 하나인 정적/애니메이션 오브젝트
- **Agent_Schema**: 하나의 Agent 종류를 정의하는 FSM_Engine용 스키마 객체 (`states`, `transitions`, `guard`, `timeout`, `probability`)
- **Speech_Bubble**: Agent 머리 위에 짧은 텍스트를 표시하는 말풍선
- **Verifier**: `tests/verify_park.js`. Node로 실행되는 PARK.EXE 전용 검증 스크립트
- **Hook**: `.kiro/hooks/*.kiro.hook` 파일로 정의된 Kiro 자동화
- **Verification_Pipeline**: Hook들로 구성된 자동 검증 흐름 (엔진 무결성, 트윈 동기화, Verifier 실행)

## Requirements

### Requirement 1: DOS 부팅 화면과 명령 프롬프트

**User Story:** As a 방문자, I want 1980년대 DOS 부팅 화면과 프롬프트를 보고 싶다, so that PARK.EXE를 직접 실행하는 향수를 느낄 수 있다.

#### Acceptance Criteria

1. WHEN Park_App이 로드되면, THE Renderer SHALL 로드 시점부터 2초 이내에 Boot_Screen에 BIOS 메모리 체크 줄, DOS 버전 줄, 그리고 Prompt를 위에서 아래 순서대로 각각 별도의 줄에 표시한다
2. WHEN 사용자가 인쇄 가능한 문자 키를 입력하면, THE Boot_Screen SHALL 입력된 문자를 100ms 이내에 Prompt 줄의 커서 위치에 에코하고 입력 줄 길이를 최대 64자로 제한한다
3. WHEN 사용자가 Backspace를 누르면, THE Boot_Screen SHALL 입력 줄의 마지막 문자 1개를 삭제하고, 입력 줄이 비어 있으면 아무 동작도 하지 않는다
4. WHEN 사용자가 Enter를 누르고 입력 줄이 대소문자를 구분하지 않고 앞뒤 공백을 제외한 상태에서 Park_Command와 일치하면, THE Park_App SHALL 파킹 시퀀스를 시작한다
5. IF 사용자가 Enter를 눌렀을 때 입력 줄이 비어 있지 않고 Park_Command와 일치하지 않으면, THEN THE Boot_Screen SHALL 입력 줄 아래에 `Bad command or file name`을 출력하고 그 다음 줄에 빈 입력의 새 Prompt를 표시한다
6. IF 사용자가 Enter를 눌렀을 때 입력 줄이 비어 있거나 공백만 있으면, THEN THE Boot_Screen SHALL 오류 메시지 없이 새 Prompt 줄만 표시한다
7. WHEN Prompt가 표시된 후 키 입력, 클릭, 터치가 없는 상태로 5초가 지나면, THE Boot_Screen SHALL `Type PARK to begin` 안내 줄을 1회 표시하고, 이후 입력이 발생해 Prompt가 갱신되기 전까지 반복 표시하지 않는다
8. WHERE 사용자가 Boot_Screen을 클릭하거나 터치하면, THE Park_App SHALL Park_Command가 입력되고 Enter가 눌린 것과 동일하게 파킹 시퀀스를 시작한다
9. WHILE 파킹 시퀀스가 진행 중이면, THE Park_App SHALL 파킹 시퀀스를 시작하는 추가 입력(Enter, 클릭, 터치)을 무시하여 시퀀스가 중복 실행되지 않게 한다

### Requirement 2: 절차적 HDD 파킹 시크 사운드

**User Story:** As a 방문자, I want 기계식 하드디스크가 헤드를 파킹하는 소리를 듣고 싶다, so that 실제 PARK.EXE 실행 경험이 재현된다.

#### Acceptance Criteria

1. THE Audio_Engine SHALL Seek_Sound를 오디오 파일 로드 없이 Web Audio 노드(oscillator, noise buffer, filter, gain)만으로 합성한다
2. WHEN 파킹 시퀀스가 시작되면, THE Audio_Engine SHALL 2.0초 이상 3.0초 이하 길이의 Seek_Sound를 재생한다
3. THE Seek_Sound SHALL 시작 주파수보다 종료 주파수가 낮은 하강 모터 스핀다운 톤 1개, 서로 20ms 이상 간격을 둔 6회 이상의 헤드 시크 클릭, 그리고 시크 클릭 이후 마지막에 위치하는 파킹 래치 클릭 1회로 구성된다
4. THE Audio_Engine SHALL AudioContext를 Audio_Unlock 이후에만 생성하거나 재개한다
5. IF AudioContext를 사용할 수 없거나 재개에 실패하면, THEN THE Park_App SHALL 예외를 사용자에게 노출하지 않고 소리 없이 파킹 시퀀스와 Office_Scene 전환을 중단 없이 계속 진행한다
6. WHEN Seek_Sound 재생이 끝나면, THE Audio_Engine SHALL 재생 종료 후 500ms 이내에 해당 재생에 사용한 모든 오디오 노드의 연결을 해제한다
7. WHILE 음소거가 켜져 있으면, THE Audio_Engine SHALL Seek_Sound와 Office_Scene 효과음을 재생하지 않고 파킹 시퀀스와 Office_Scene 전환은 음소거가 꺼진 경우와 동일한 타이밍으로 진행한다
8. WHEN 사용자가 Seek_Sound 재생 중에 음소거를 켜면, THE Audio_Engine SHALL 100ms 이내에 재생을 중지한다

### Requirement 3: CRT 화면 전환

**User Story:** As a 방문자, I want 파킹 후 화면이 CRT 모니터 뷰로 바뀌길 원한다, so that 스크린세이버가 시작되는 느낌을 받을 수 있다.

#### Acceptance Criteria

1. WHEN 파킹 시퀀스가 시작되면, THE Renderer SHALL Seek_Sound 재생 시간 동안 Boot_Screen에 화면 흔들림(수평·수직 오프셋 최대 ±4 논리 픽셀, 매 프레임 갱신)과 수직 롤 효과(초당 1회 이상 화면 높이를 순환)를 적용한다
2. WHEN Seek_Sound 재생이 끝나면, THE Renderer SHALL 100ms 이상 500ms 이하의 CRT 켜짐 효과로 Boot_Screen에서 Office_Scene으로 전환한다
3. WHILE Office_Scene이 표시되는 동안, THE Renderer SHALL CRT_View의 스캔라인, 비네트, 인광 글로우를 매 프레임 적용한다
4. WHILE Office_Scene이 표시되는 동안, THE Renderer SHALL 논리 해상도 320x200을 1 이상의 정수 배율(디바이스 픽셀 기준)로 확대하여 그리며, CRT 베젤 화면 영역에 맞는 최대 정수 배율을 사용한다
5. WHILE Office_Scene이 표시되는 동안, THE Renderer SHALL 이미지 스무딩을 끄고 nearest-neighbor 방식으로 확대한다
6. WHEN 사용자가 Office_Scene에서 키를 누르거나 클릭하면, THE Park_App SHALL 입력 후 500ms 이내에 Boot_Screen의 Prompt로 복귀한다
7. IF 베젤 화면 영역(뷰포트)이 320x200 정수 1배율보다 작으면, THEN THE Renderer SHALL 1배율로 그리고 넘치는 영역을 잘라내며 오류 없이 Office_Scene 표시를 유지한다
8. IF 전환 효과(1~2번 기준) 진행 중에 사용자 입력이 발생하면, THEN THE Park_App SHALL 해당 입력을 무시하고 현재 상태와 효과 진행을 유지한다

### Requirement 4: 16x16 픽셀아트 Agent와 걷기 애니메이션

**User Story:** As a 방문자, I want 네 종류의 귀여운 16x16 캐릭터가 뒤뚱뒤뚱 걷는 모습을 보고 싶다, so that 미니어처 픽셀 에이전트의 매력을 느낄 수 있다.

#### Acceptance Criteria

1. THE Park_App SHALL Boss, Junior_Developer, Copier_Runner, Coffee_Bot 네 종류의 Agent Sprite를 코드 내 문자열 팔레트 데이터로 정의한다
2. THE Park_App SHALL 각 Agent 종류마다 가로 16픽셀 x 세로 16픽셀의 Walk_Frame을 정확히 2개(Walk_Frame A, Walk_Frame B) 정의하며, 각 Walk_Frame은 정확히 256개(16x16)의 픽셀 값을 가진다
3. THE Park_App SHALL 이미지 파일을 로드하지 않고 모든 Sprite를 Canvas 2D 픽셀 단위 렌더링으로 그린다
4. WHILE Agent가 걷는 상태이면, THE Renderer SHALL 160ms(허용 오차 ±16ms) 간격으로 Walk_Frame A와 Walk_Frame B를 번갈아 표시한다
5. WHILE Agent가 걷는 상태이면, THE Renderer SHALL Walk_Frame 전환 시마다 Agent의 y 좌표를 기준 위치 대비 Walk_Frame A에서는 0픽셀, Walk_Frame B에서는 -1픽셀로 오프셋하여 뒤뚱거림을 표현한다
6. WHILE Agent의 이동 방향이 왼쪽이면, THE Renderer SHALL Sprite를 수평 반전하여 그리고, WHILE 이동 방향이 오른쪽이면 반전 없이 그린다
7. WHILE Agent가 걷지 않는 상태이면, THE Renderer SHALL Walk_Frame A를 y 오프셋 0픽셀로 고정 표시한다
8. THE Junior_Developer Sprite SHALL 문서를 든 모습을 포함하고, WHILE Junior_Developer가 문서를 들고 있지 않으면 THE Renderer SHALL 문서 픽셀을 그리지 않는다
9. IF Sprite 데이터에 정의되지 않은 팔레트 문자가 포함되어 있으면, THEN THE Renderer SHALL 해당 픽셀을 투명으로 처리하여 그리지 않고 나머지 픽셀의 렌더링을 계속한다

### Requirement 5: 사무실 오브젝트

**User Story:** As a 방문자, I want 사무실에 책상, 복사기, 정수기, 서버 랙이 있는 모습을 보고 싶다, so that 스크린세이버가 생동감 있는 사무실처럼 보인다.

#### Acceptance Criteria

1. WHEN Office_Scene이 처음 그려질 때, THE Renderer SHALL boss desk, copier, water cooler, server rack 네 Office_Object를 각각 고정된 좌표에 그리고, 프레임 간 및 캔버스 크기가 변경되지 않는 한 각 Office_Object의 좌표 변화량을 0px로 유지한다
2. WHILE Office_Scene이 표시되는 동안, THE Renderer SHALL copier의 스캔 광원 바를 copier 상단 가장자리에서 하단 가장자리까지 2초 주기로 이동시키고, 하단에 도달하면 즉시 상단에서 다시 시작하도록 반복해서 그린다
3. WHILE Office_Scene이 표시되고 Copier_Runner가 인쇄 중 상태인 동안, THE Renderer SHALL copier의 스캔 광원을 대기 상태 광원보다 밝은 색으로 표시한다
4. WHEN Copier_Runner가 인쇄 중 상태를 벗어나면, THE Renderer SHALL 1프레임 이내에 copier의 스캔 광원을 대기 상태 색으로 되돌린다
5. WHILE Office_Scene이 표시되는 동안, THE Renderer SHALL server rack의 LED를 최소 3개 그리고, 각 LED가 서로 다른 깜박임 주기(300ms 이상 2000ms 이하)를 갖도록 그린다
6. WHILE Office_Scene이 표시되고 Coffee_Bot이 물을 뜨는 상태인 동안, THE Renderer SHALL water cooler에 기포 애니메이션을 그린다
7. WHEN Coffee_Bot이 물을 뜨는 상태를 벗어나면, THE Renderer SHALL 1프레임 이내에 water cooler의 기포 애니메이션 그리기를 중단한다
8. THE Park_App SHALL 모든 Office_Object를 이미지 파일을 로드하지 않고 Canvas 2D 도형과 픽셀 데이터만으로 그린다

### Requirement 6: FSM_Engine 재사용 (무수정)

**User Story:** As a 심사위원, I want 기존 공유 엔진이 한 줄도 바뀌지 않고 재사용되는 것을 확인하고 싶다, so that Skeleton Crew 트랙의 핵심 주장이 유지된다.

#### Acceptance Criteria

1. THE Park_App SHALL 모든 Agent의 상태 전이를 `src/core/fsm-engine.js`의 `FsmEngine` 인스턴스(Agent당 1개)를 통해서만 수행하고, Agent 상태를 FsmEngine 외부의 변수나 별도 상태 머신으로 보관하지 않는다
2. THE Park_App SHALL `src/core/fsm-engine.js`와 `src/core/fsm-engine.ts`를 수정하지 않고 import하여 사용한다 (park-exe 작업 이전 대비 변경 바이트 0, 변경 줄 0)
3. THE Park_App SHALL Canvas 렌더링, Web Audio 재생, DOM 조작, 좌표 이동 로직을 Agent_Schema와 `onStateChange` 리스너 내부 또는 그 리스너가 호출하는 앱 전용 모듈에만 둔다
4. THE Park_App SHALL 확률 분기를 동일 `from` 상태와 동일 이벤트에 `probability` 가중치를 가진 2개 이상의 transition으로 표현하고, 해당 이벤트의 `probability` 합이 1.0(부동소수점 오차 허용 ±0.001)이 되도록 정의한다
5. WHEN Verifier가 실행되면, THE Verifier SHALL `src/core/fsm-engine.js`의 SHA-256 해시를 park-exe 작업 이전 기준 해시와 비교한다
6. IF `src/core/fsm-engine.js`의 해시가 기준 해시와 다르면, THEN THE Verifier SHALL 해시 불일치를 나타내는 실패 메시지를 출력하고 0이 아닌 종료 코드로 종료한다
7. WHEN `npm test`가 실행되면, THE Park_App SHALL 기존 `tests/verify_chrono.js`의 모든 기존 검사를 변경 없이 실행하고, 그 결과가 park-exe 작업 이전과 동일하게 전부 통과(실패 0건)하게 한다
8. THE Park_App SHALL 기존 `index.html`의 3개 앱(Neon Focus Clock, Halloween Jack-in-the-Box, Haunted Vending Machine)의 상태, 전이, 렌더링, 오디오 동작을 변경하지 않는다

### Requirement 7: Junior_Developer와 Boss의 문서 승인/반려 FSM

**User Story:** As a 방문자, I want 신입이 문서를 들고 보스에게 가서 승인 또는 반려되는 모습을 보고 싶다, so that 사무실 드라마를 즐길 수 있다.

#### Acceptance Criteria

1. THE Junior_Developer Agent_Schema SHALL IDLE, WALKING_TO_BOSS, SUBMITTING, APPROVED, REJECTED, RETURNING 상태를 정의한다
2. WHEN Junior_Developer가 IDLE 상태에 진입한 뒤 4.0초 이상 8.0초 이하의 무작위 대기 시간이 경과하면, THE Junior_Developer SHALL 문서를 들고 WALKING_TO_BOSS 상태로 전이한다
3. WHEN Junior_Developer가 WALKING_TO_BOSS 상태에서 boss desk 앞 도착 위치에 도달하면, THE Junior_Developer SHALL SUBMITTING 상태로 전이한다
4. WHEN Junior_Developer가 SUBMITTING 상태에서 `REVIEW` 이벤트를 받으면, THE Agent_Schema SHALL 확률 0.70으로 APPROVED, 확률 0.30으로 REJECTED로 전이하는 두 transition을 가진다
5. WHEN Junior_Developer가 APPROVED 상태에 진입하면, THE Speech_Bubble SHALL `APPROVED! 🎉` 텍스트를 표시한다
6. WHEN Junior_Developer가 REJECTED 상태에 진입하면, THE Speech_Bubble SHALL `REJECTED?! 😭` 텍스트를 표시한다
7. WHEN Junior_Developer가 APPROVED 상태에 진입하면, THE Copier_Runner SHALL 복사 작업 요청을 1회 받는다
8. WHEN Junior_Developer가 APPROVED 또는 REJECTED 상태에 진입한 뒤 1.5초가 경과하면, THE Junior_Developer SHALL RETURNING 상태로 전이한다
9. WHEN Junior_Developer가 RETURNING 상태에서 시작 위치에 도달하면, THE Junior_Developer SHALL IDLE 상태로 전이한다
10. FOR ALL 10,000회 반복 REVIEW 시뮬레이션에서, THE APPROVED 비율 SHALL 0.67 이상 0.73 이하이다
11. THE Boss Agent_Schema SHALL IDLE, REVIEWING, STAMP_APPROVE, STAMP_REJECT 상태를 정의한다
12. WHEN Junior_Developer가 SUBMITTING 상태에 진입하면, THE Boss SHALL REVIEWING 상태로 전이하고 1.0초 후 Junior_Developer에게 `REVIEW` 이벤트를 전달한다
13. WHEN Junior_Developer가 APPROVED 상태에 진입하면, THE Boss SHALL STAMP_APPROVE 상태로 전이하고, WHEN Junior_Developer가 REJECTED 상태에 진입하면, THE Boss SHALL STAMP_REJECT 상태로 전이한다
14. WHEN Junior_Developer가 RETURNING 상태에 진입하면, THE Boss SHALL IDLE 상태로 전이한다
15. IF Junior_Developer가 SUBMITTING 이외의 상태에서 `REVIEW` 이벤트를 받으면, THEN THE Junior_Developer SHALL 현재 상태를 유지하고 해당 이벤트를 무시한다

### Requirement 8: Copier_Runner 인쇄 루프 FSM

**User Story:** As a 방문자, I want 복사기 담당이 복사기와 책상 사이를 오가며 인쇄하는 모습을 보고 싶다, so that 사무실의 반복 업무 분위기를 느낄 수 있다.

#### Acceptance Criteria

1. THE Copier_Runner Agent_Schema SHALL IDLE, WALKING_TO_COPIER, PRINTING, DELIVERING, WAITING의 5개 상태를 정의하고, 초기 상태를 IDLE로 지정한다
2. WHEN Copier_Runner가 IDLE 상태에서 4.0초 이상 8.0초 이하의 무작위 휴식 시간을 보낸 뒤 복사 작업 요청 이벤트를 받으면, THE Copier_Runner SHALL (휴식 시간 이전의 요청은 거부되며 작업은 큐에 남는다) WALKING_TO_COPIER 상태로 전이한다
3. WHEN Copier_Runner가 WALKING_TO_COPIER 상태에서 copier 앞에 도착하면, THE Copier_Runner SHALL PRINTING 상태로 전이하고 `context.pagesPrinted`를 0으로 설정한다
4. WHILE Copier_Runner가 PRINTING 상태이면, THE Copier_Runner Agent_Schema SHALL `context.pagesPrinted` 값을 1000ms마다 1씩 증가시킨다
5. WHEN PRINTING 상태에서 `context.pagesPrinted` 값이 `context.pagesTarget` 값 이상이 되면, THE Copier_Runner SHALL DELIVERING 상태로 전이한다
6. IF PRINTING 상태에서 1000ms 간격의 증가 후 `context.pagesPrinted`가 `context.pagesTarget`보다 작으면, THEN THE Copier_Runner Agent_Schema SHALL PRINTING 상태를 유지하는 self transition을 수행하여 인쇄 루프를 반복한다
7. WHEN Copier_Runner가 DELIVERING 상태에서 boss desk에 도착하면, THE Copier_Runner SHALL WAITING 상태로 전이하고 `context.pagesPrinted`를 0으로 초기화한다
8. WHEN Copier_Runner가 WAITING 상태에 진입한 후 2000ms가 지나면, THE Copier_Runner SHALL IDLE 상태로 전이한다
9. WHEN Copier_Runner가 WALKING_TO_COPIER 상태로 전이하면, THE Copier_Runner Agent_Schema SHALL `context.pagesTarget`을 2 이상 4 이하의 정수 중 하나로 설정한다

### Requirement 9: Coffee_Bot FSM과 말풍선

**User Story:** As a 방문자, I want 커피 봇이 돌아다니며 혼잣말을 하는 모습을 보고 싶다, so that 스크린세이버에 개성이 생긴다.

#### Acceptance Criteria

1. THE Coffee_Bot Agent_Schema SHALL IDLE, WALKING_TO_COOLER, FILLING, SERVING, RECHARGING의 5개 상태를 정의하고, 초기 상태를 IDLE로 지정한다
2. WHEN Coffee_Bot이 IDLE 상태에 진입한 후 4.0초 이상 8.0초 이하의 무작위 대기 시간이 경과하면, THE Coffee_Bot SHALL WALKING_TO_COOLER 상태로 전이한다
3. WHEN Coffee_Bot이 WALKING_TO_COOLER 상태에서 water cooler 앞의 도착 지점(목표 좌표와의 거리 2픽셀 이하)에 도달하면, THE Coffee_Bot SHALL FILLING 상태로 전이한다
4. WHEN Coffee_Bot이 FILLING 상태에 진입한 후 1.5초가 경과하면, THE Coffee_Bot SHALL SERVING 상태로 전이한다
5. WHEN Coffee_Bot이 SERVING 상태에서 boss desk의 도착 지점(목표 좌표와의 거리 2픽셀 이하)에 도달하면, THE Boss SHALL `Nice brew ☕` Speech_Bubble을 2.0초 동안 표시한다
6. WHEN Coffee_Bot이 SERVING 상태에서 boss desk에 도착하여 Boss의 `Nice brew ☕` Speech_Bubble 표시가 시작되면, THE Coffee_Bot SHALL RECHARGING 상태로 전이한다
7. WHEN Coffee_Bot이 RECHARGING 상태에서 server rack 앞의 도착 지점에 도달한 후 2.0초가 경과하면, THE Coffee_Bot SHALL IDLE 상태로 전이한다
8. WHEN Agent가 상태에 진입하고 해당 상태에 대사가 정의되어 있으면, THE Renderer SHALL 해당 Agent 머리 위에 Speech_Bubble을 2.0초 동안 표시한 뒤 제거한다. 대사는 영어이며 네 Agent 모두 상태별 대사를 가진다(대사가 배열이면 주입된 rng로 하나를 고른다). 폰트는 `Consolas, monospace`를 쓴다
9. WHILE Speech_Bubble이 표시되는 동안, THE Renderer SHALL 매 프레임 Speech_Bubble 전체 영역이 320x200 논리 화면의 경계(x 0~319, y 0~199) 안에 완전히 들어오도록 위치를 보정한다
10. WHEN 한 Agent의 Speech_Bubble이 표시 중인 상태에서 같은 Agent에 대한 새 Speech_Bubble이 요청되면, THE Renderer SHALL 기존 Speech_Bubble을 즉시 제거하고 새 Speech_Bubble을 2.0초 동안 표시한다

### Requirement 10: 시뮬레이션 루프와 자원 관리

**User Story:** As a 방문자, I want 스크린세이버가 오래 켜져 있어도 부드럽게 돌아가길 원한다, so that 안정적으로 감상할 수 있다.

#### Acceptance Criteria

1. WHILE Office_Scene이 표시되는 동안, THE Renderer SHALL `requestAnimationFrame` 루프로 브라우저 디스플레이 주사율에 맞춰 매 프레임 장면 전체를 다시 그린다
2. WHEN 브라우저 탭이 숨겨진 상태(document.visibilityState가 "hidden")로 전환되면, THE Park_App SHALL 1프레임 이내에 렌더 루프와 Agent 이동 갱신을 일시정지하고 Agent 위치와 FsmEngine 상태를 그대로 유지한다
3. WHEN 숨겨진 탭이 다시 표시되면, THE Park_App SHALL 재개 후 첫 프레임의 경과 시간을 0ms로 간주하여, 숨겨진 시간만큼의 Agent 위치 변화 없이 일시정지 직전 위치에서 시뮬레이션을 재개한다
4. WHEN Park_App이 Boot_Screen으로 복귀하면, THE Park_App SHALL 모든 FsmEngine 인스턴스에 `destroy()`를 정확히 1회씩 호출하고, 활성 타이머와 `requestAnimationFrame` 예약을 모두 해제한다
5. WHEN 프레임 간 경과 시간이 100ms를 초과하면, THE Park_App SHALL 해당 프레임의 이동량 계산에 사용하는 경과 시간을 100ms로 제한한다
6. THE Park_App SHALL 모든 Agent 이동 속도를 초당 픽셀 단위로 정의하고, 이동량을 `속도(px/s) × 경과 시간(s)`으로 계산하여 주사율(30Hz, 60Hz, 144Hz)에 관계없이 동일한 시간 동안 동일한 거리(오차 ±1px)를 이동하게 한다
7. IF `destroy()` 호출 중 예외가 발생하면, THEN THE Park_App SHALL 나머지 FsmEngine 인스턴스의 `destroy()`와 타이머 해제를 계속 수행하고 Boot_Screen 복귀를 완료한다

### Requirement 11: 파일 구성과 서빙

**User Story:** As a 개발자, I want PARK.EXE가 기존 프로젝트에 충돌 없이 추가되길 원한다, so that 기존 앱과 함께 배포하고 검증할 수 있다.

#### Acceptance Criteria

1. THE Park_App SHALL 진입점 `park.html`과 `src/park/` 디렉터리의 ES 모듈로 구성된다
2. THE Park_App SHALL 외부 라이브러리, CDN 리소스, 이미지 에셋을 사용하지 않고 동작하며, `park.html` 로드 시 같은 출처(origin) 외부로 나가는 네트워크 요청이 0건이다
3. WHEN 사용자가 `npm start`로 서버를 실행하고 `/park.html`에 접속하면, THE Park_App SHALL HTTP를 통해 ES 모듈을 로드하고 3초 이내에 Boot_Screen을 표시한다
4. IF `park.html`의 ES 모듈 중 하나라도 로드에 실패하면, THEN THE Park_App SHALL 빈 화면 대신 로드 실패를 알리는 텍스트 오류 메시지를 화면에 표시하고 실패한 모듈의 경로를 브라우저 콘솔에 출력한다
5. THE `package.json` SHALL `test` 스크립트가 `tests/verify_chrono.js`와 `tests/verify_park.js`를 모두 실행하도록 구성하며, 둘 중 하나라도 실패하면 프로세스 종료 코드가 0이 아니다
6. THE `package.json` SHALL `tests/verify_park.js`만 실행하는 `test:park` 스크립트를 제공하며, 테스트 통과 시 종료 코드 0, 실패 시 0이 아닌 종료 코드를 반환한다
7. THE Park_App SHALL Agent_Schema, Sprite 데이터, 시뮬레이션 로직을 `document`, `window`, Canvas API를 참조하지 않는 모듈로 분리하여, Node 환경에서 `import`만으로 오류 없이 로드되도록 한다
8. WHERE GitHub Pages 배포가 활성화되어 있으면, THE Park_App SHALL `park.html`과 `src/park/` 하위 모든 파일이 기존 배포 워크플로의 산출물에 포함되어 배포된 사이트의 `/park.html` 경로에서 HTTP 200으로 제공되도록 한다
9. THE Park_App SHALL 기존 파일(`index.html`, `src/core/fsm-engine.js`, `src/core/fsm-engine.ts`, `tests/verify_chrono.js`)의 내용을 수정하지 않는다. 단, `index.html`의 `park.html` 링크 추가와 `package.json`의 스크립트 추가는 예외로 한다
10. THE `index.html` SHALL `park.html`로 이동하는 링크 요소를 1개 이상 제공하며, 해당 링크를 클릭하면 `park.html`이 로드된다

### Requirement 12: PARK.EXE Verifier

**User Story:** As a 개발자, I want PARK.EXE 전용 검증 스크립트를 원한다, so that Node에서 FSM 불변식과 데이터 무결성을 자동으로 확인할 수 있다.

#### Acceptance Criteria

1. WHEN `node tests/verify_park.js`가 실행되면, THE Verifier SHALL 각 검사 항목마다 정확히 한 줄씩 "PASS" 또는 "FAIL"로 시작하는 줄을 표준 출력에 출력한다
2. IF 하나 이상의 검사가 FAIL이면, THEN THE Verifier SHALL 모든 검사를 끝까지 실행한 뒤 종료 코드 1로 종료하고, FAIL 줄에 실패한 검사 항목의 이름과 기대값 및 실제값을 포함한다
3. WHEN 모든 검사가 통과하면, THE Verifier SHALL 종료 코드 0으로 종료한다
4. THE Verifier SHALL 네 Agent Sprite 각각의 두 Walk_Frame(총 8개)이 정확히 16행이고 각 행이 정확히 16열인지 검사한다
5. THE Verifier SHALL 모든 Sprite 셀의 팔레트 인덱스가 0 이상이고 해당 Sprite에 정의된 팔레트의 길이 미만인 정수인지 검사한다
6. THE Verifier SHALL 모든 Agent_Schema의 모든 transition target이 해당 스키마의 `states`에 존재하는지 검사한다
7. THE Verifier SHALL 모든 Agent_Schema의 `initialState`가 `IDLE`인지 검사한다
8. THE Verifier SHALL 동일 이벤트와 동일 출발 상태를 공유하는 확률 transition 그룹마다 `probability` 합이 1.0과 1e-9 이하의 오차 내에서 같은지 검사한다
9. THE Verifier SHALL 시드 고정된 난수 함수로 REVIEW 이벤트를 10,000회 전송하여 APPROVED 비율이 0.67 이상 0.73 이하인지 검사하고, 동일 시드로 재실행하면 동일한 비율이 나오는지 보장한다
10. THE Verifier SHALL `pagesTarget`이 1, 3, 5인 각 경우에 대해 Copier_Runner가 PRINTING 루프를 정확히 `pagesTarget`회 수행한 직후 DELIVERING 상태에 도달하는지 검사한다
11. THE Verifier SHALL `src/core/fsm-engine.js`와 `src/core/fsm-engine.ts`에서 주석, 공백, 타입 표기를 제거한 런타임 로직이 동일한지 검사한다
12. THE Verifier SHALL 외부 입력 없이 호출 가능한 순수 함수를 통해 Seek_Sound 파라미터 계획의 총 길이, 클릭 횟수, 래치 존재 여부가 Requirement 2에 명시된 값 또는 범위를 만족하는지 검사한다
13. THE Verifier SHALL `package.json`의 dependencies 없이 Node 내장 모듈(`node:` 접두 모듈)만 import하여 실행된다
14. IF 검사 대상 파일을 읽을 수 없거나 import에 실패하면, THEN THE Verifier SHALL 해당 검사를 FAIL로 출력하고, 나머지 검사를 계속 실행하며, 종료 코드 1로 종료한다

### Requirement 13: Kiro Hooks 기반 자동 검증 파이프라인

**User Story:** As a 개발자, I want Kiro hooks가 파일을 저장할 때마다 자동으로 검증을 돌려주길 원한다, so that 엔진 무결성과 PARK.EXE 품질이 계속 유지된다.

#### Acceptance Criteria

1. THE Verification_Pipeline SHALL `.kiro/hooks/` 디렉터리에 `.kiro.hook` 확장자의 유효한 JSON 파일로 Hook을 정의하며, 각 파일은 이름, 트리거 이벤트, 실행할 동작을 각각 1개 이상 포함한다
2. WHEN `src/park/**` 또는 `park.html` 파일이 저장되면, THE Verification_Pipeline SHALL `node tests/verify_park.js`를 실행하고, 완료 후 전체 검사 수, PASS 수, FAIL 수를 포함한 PASS/FAIL 요약을 사용자에게 보고한다
3. WHEN `src/core/fsm-engine.js` 파일이 저장되면, THE Verification_Pipeline SHALL `src/core/fsm-engine.ts`와의 런타임 로직 동기화 여부를 확인하고 `npm test`를 실행하여, 동기화 상태(일치/불일치)와 `npm test` 종료 결과(통과/실패)를 각각 보고한다
4. WHEN `src/core/fsm-engine.js` 또는 `src/core/fsm-engine.ts` 파일이 park-exe 작업 중 저장되면, THE Verification_Pipeline SHALL 공유 엔진 무수정 원칙 위반 경고를 변경된 파일명과 함께 사용자에게 보고한다
5. WHEN 사용자가 전체 테스트 수동 실행 Hook 버튼을 누르면, THE Verification_Pipeline SHALL `npm test`를 1회 실행하고 Chrono-FSM 검증 결과와 PARK.EXE 검증 결과를 구분하여 각각의 PASS/FAIL 수와 함께 요약한다
6. WHEN 사용자가 구조 감사 Hook 버튼을 누르면, THE Verification_Pipeline SHALL PARK.EXE의 (a) Sprite 크기 규칙, (b) 확률 합이 100%(또는 1.0)인지 여부, (c) 오디오가 사용자 제스처 이후에만 활성화되는지 여부를 점검하고, 항목별로 PASS/FAIL을 보고한다
7. IF Hook이 실행한 검증이 1개 이상 실패하면, THEN THE Verification_Pipeline SHALL 실패한 검사 이름과 의심 파일 경로를 보고하고, 실패 원인이 공유 엔진 자체 결함으로 확인된 경우에만 `src/core/fsm-engine.js` 수정 제안을 포함한다
8. THE Verification_Pipeline SHALL 기존 `verify-chrono.kiro.hook` 파일의 내용을 바이트 단위로 변경하지 않고 유지한다
9. THE Verification_Pipeline SHALL 새 Hook을 정확히 4개 이상 제공하며, 그 목록은 파크 앱 저장 검증, 엔진 가드, 전체 테스트 수동 실행, 구조 감사를 모두 포함한다
