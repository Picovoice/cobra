cmake_minimum_required(VERSION 3.4)
project(cobra_demo_c)

set(CMAKE_C_STANDARD 99)
set(CMAKE_BUILD_TYPE Release)
add_subdirectory(pvrecorder)

set(COMMON_LIBS dl)
include_directories("${PROJECT_SOURCE_DIR}/../../include")

add_executable(
        cobra_demo_file
        cobra_demo_file.c)
target_include_directories(cobra_demo_file PRIVATE dr_libs)

add_executable(
        cobra_demo_mic
        cobra_demo_mic.c
        $<TARGET_OBJECTS:pv_recorder_object>)
target_include_directories(cobra_demo_mic PRIVATE pvrecorder/include)

if (NOT WIN32)
    target_link_libraries(
            cobra_demo_mic
            pthread
            m
            ${COMMON_LIBS})
    target_link_libraries(cobra_demo_file ${COMMON_LIBS})
    if((${CMAKE_SYSTEM_PROCESSOR} MATCHES "arm") AND (UNIX AND NOT APPLE))
        target_link_libraries(cobra_demo_mic atomic)
    endif()
endif()