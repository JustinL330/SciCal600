/*
 * SciCal600 colourful love-heart Easter egg
 * Build (Linux/macOS): cc -std=c11 -O2 love-heart.c -lm -o love-heart
 * Build (Windows/MinGW): gcc -std=c11 -O2 love-heart.c -lm -o love-heart.exe
 * Run in an ANSI/VT-compatible terminal and press Ctrl+C to stop.
 */

#ifndef _WIN32
#define _POSIX_C_SOURCE 199309L
#endif

#include <math.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <time.h>
#endif

static volatile sig_atomic_t keep_beating = 1;

static void stop_heart(int signal_number) {
    (void)signal_number;
    keep_beating = 0;
}

static void sleep_milliseconds(long milliseconds) {
#ifdef _WIN32
    Sleep((DWORD)milliseconds);
#else
    struct timespec delay = {
        .tv_sec = milliseconds / 1000,
        .tv_nsec = (milliseconds % 1000) * 1000000L,
    };
    nanosleep(&delay, NULL);
#endif
}

#ifdef _WIN32
static void enable_terminal_colour(void) {
    HANDLE output = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD mode = 0;
    if (output != INVALID_HANDLE_VALUE && GetConsoleMode(output, &mode)) {
        SetConsoleMode(output, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
    }
    SetConsoleOutputCP(CP_UTF8);
}
#else
static void enable_terminal_colour(void) { }
#endif

int main(void) {
    const int width = 40;
    const int height = 25;
    const char *caption = "SciCal600 loves C  |  Ctrl+C to stop";
    unsigned long frame = 0;

    signal(SIGINT, stop_heart);
    enable_terminal_colour();
    setvbuf(stdout, NULL, _IONBF, 0);
    printf("\x1b[2J\x1b[?25l");

    while (keep_beating) {
        const double time = frame * 0.11;
        const double pulse = 1.0 + 0.075 * sin(time * 2.0)
                                 + 0.025 * sin(time * 4.0 + 0.65);

        printf("\x1b[H");
        for (int row = 0; row < height; ++row) {
            const double y = (1.30 - 2.60 * row / (height - 1)) / pulse;
            for (int column = 0; column < width; ++column) {
                const double x = (-1.55 + 3.10 * column / (width - 1)) / pulse;
                const double curve = pow(x * x + y * y - 1.0, 3.0)
                                   - x * x * pow(y, 3.0);

                if (curve <= 0.0) {
                    const int red = (int)(150.0 + 105.0 * sin(time + column * 0.06));
                    const int green = (int)(125.0 + 110.0 * sin(time + row * 0.12 + 2.1));
                    const int blue = (int)(150.0 + 105.0 * sin(time + column * 0.04 + 4.2));
                    printf("\x1b[38;2;%d;%d;%dm██", red, green, blue);
                } else {
                    printf("  ");
                }
            }
            printf("\x1b[0m\n");
        }

        const int caption_padding = (width * 2 - (int)strlen(caption)) / 2;
        printf("\x1b[38;2;255;125;190m%*s%s\x1b[0m\n",
               caption_padding > 0 ? caption_padding : 0, "", caption);
        ++frame;
        sleep_milliseconds(55);
    }

    printf("\x1b[0m\x1b[?25h\nThanks for finding the Easter egg!\n");
    return 0;
}
